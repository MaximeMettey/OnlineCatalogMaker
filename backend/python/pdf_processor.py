#!/usr/bin/env python3
"""
PDF Processor using PyMuPDF (fitz)
Handles PDF splitting, image generation, and text extraction
"""
import fitz  # PyMuPDF
import json
import sys
import os
from pathlib import Path
from PIL import Image
import io

def analyze_pages(pdf_path):
    """Analyze PDF pages to detect double pages"""
    doc = fitz.open(pdf_path)
    page_structure = []

    for i, page in enumerate(doc):
        rect = page.rect
        width = rect.width
        height = rect.height
        aspect_ratio = width / height

        # Double page detection: aspect ratio > 1.5
        is_double_page = aspect_ratio > 1.5

        page_structure.append({
            'index': i,
            'width': width,
            'height': height,
            'aspect_ratio': aspect_ratio,
            'is_double_page': is_double_page
        })

        if is_double_page:
            print(f"  Page {i + 1}: {width}x{height} (ratio: {aspect_ratio:.2f}) - DOUBLE PAGE", file=sys.stderr)

    doc.close()
    return page_structure

def process_single_page(pdf_path, page_index, output_page_number, output_dir):
    """Process a single PDF page: extract, generate images, extract text"""
    doc = fitz.open(pdf_path)
    page = doc[page_index]

    # Create output directory
    pages_dir = Path(output_dir) / 'pages'
    pages_dir.mkdir(parents=True, exist_ok=True)

    page_prefix = f"page_{output_page_number}"

    # 1. Extract single page as PDF
    single_page_doc = fitz.open()
    single_page_doc.insert_pdf(doc, from_page=page_index, to_page=page_index)
    pdf_path_out = pages_dir / f"{page_prefix}.pdf"
    single_page_doc.save(str(pdf_path_out))
    single_page_doc.close()

    # 2. Generate images (PNG and JPG) at high resolution
    mat = fitz.Matrix(2.0, 2.0)  # 2x scale for high quality
    pix = page.get_pixmap(matrix=mat)

    # Save PNG
    png_path = pages_dir / f"{page_prefix}.png"
    pix.save(str(png_path))

    # Convert to JPG using Pillow
    img = Image.open(png_path)
    jpg_path = pages_dir / f"{page_prefix}.jpg"
    img.convert('RGB').save(jpg_path, 'JPEG', quality=90)

    width = pix.width
    height = pix.height

    # 3. Extract text with positions
    text_data = extract_text_with_positions(page)

    doc.close()

    return {
        'pdf_path': str(pdf_path_out.relative_to(output_dir.parent)),
        'png_path': str(png_path.relative_to(output_dir.parent)),
        'jpg_path': str(jpg_path.relative_to(output_dir.parent)),
        'width': width,
        'height': height,
        'text_data': text_data
    }

def process_double_page(pdf_path, page_index, start_page_number, output_dir):
    """Split a double page into two separate pages"""
    doc = fitz.open(pdf_path)
    page = doc[page_index]
    rect = page.rect

    # Split into left and right halves
    half_width = rect.width / 2

    left_rect = fitz.Rect(0, 0, half_width, rect.height)
    right_rect = fitz.Rect(half_width, 0, rect.width, rect.height)

    results = []

    # Process left half
    left_result = process_cropped_page(doc, page_index, start_page_number, output_dir, left_rect, 'left')
    results.append(left_result)

    # Process right half
    right_result = process_cropped_page(doc, page_index, start_page_number + 1, output_dir, right_rect, 'right')
    results.append(right_result)

    doc.close()
    return results

def process_cropped_page(doc, page_index, output_page_number, output_dir, crop_rect, side):
    """Process a cropped portion of a page"""
    page = doc[page_index]

    pages_dir = Path(output_dir) / 'pages'
    pages_dir.mkdir(parents=True, exist_ok=True)

    page_prefix = f"page_{output_page_number}"

    # 1. Create cropped PDF
    single_page_doc = fitz.open()
    single_page_doc.insert_pdf(doc, from_page=page_index, to_page=page_index)
    cropped_page = single_page_doc[0]
    cropped_page.set_cropbox(crop_rect)

    pdf_path_out = pages_dir / f"{page_prefix}.pdf"
    single_page_doc.save(str(pdf_path_out))
    single_page_doc.close()

    # 2. Generate images from cropped area
    mat = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=mat, clip=crop_rect)

    # Save PNG
    png_path = pages_dir / f"{page_prefix}.png"
    pix.save(str(png_path))

    # Convert to JPG
    img = Image.open(png_path)
    jpg_path = pages_dir / f"{page_prefix}.jpg"
    img.convert('RGB').save(jpg_path, 'JPEG', quality=90)

    width = pix.width
    height = pix.height

    # 3. Extract text from cropped area
    text_data = extract_text_with_positions(page, crop_rect)

    print(f"  Page {output_page_number} ({side} half) processed successfully", file=sys.stderr)

    return {
        'pdf_path': str(pdf_path_out.relative_to(output_dir.parent)),
        'png_path': str(png_path.relative_to(output_dir.parent)),
        'jpg_path': str(jpg_path.relative_to(output_dir.parent)),
        'width': width,
        'height': height,
        'text_data': text_data
    }

def extract_text_with_positions(page, clip_rect=None):
    """Extract text with word and paragraph positions"""
    # Get text blocks (paragraphs)
    blocks = page.get_text("dict", clip=clip_rect)["blocks"]

    paragraphs = []
    words = []

    for block in blocks:
        if block.get("type") == 0:  # Text block
            for line in block.get("lines", []):
                para_text = ""
                para_bbox = None
                para_words = []

                for span in line.get("spans", []):
                    span_text = span.get("text", "")
                    span_bbox = span.get("bbox", [0, 0, 0, 0])

                    # Adjust coordinates if clipped
                    if clip_rect:
                        x0 = span_bbox[0] - clip_rect.x0
                        y0 = span_bbox[1] - clip_rect.y0
                        x1 = span_bbox[2] - clip_rect.x0
                        y1 = span_bbox[3] - clip_rect.y0
                    else:
                        x0, y0, x1, y1 = span_bbox

                    # Store word
                    word_data = {
                        'text': span_text,
                        'x': x0,
                        'y': y0,
                        'width': x1 - x0,
                        'height': y1 - y0,
                        'font_name': span.get('font', 'Unknown'),
                        'font_size': span.get('size', 0)
                    }
                    words.append(word_data)
                    para_words.append(word_data)

                    para_text += span_text + " "

                    if para_bbox is None:
                        para_bbox = [x0, y0, x1, y1]
                    else:
                        para_bbox[0] = min(para_bbox[0], x0)
                        para_bbox[1] = min(para_bbox[1], y0)
                        para_bbox[2] = max(para_bbox[2], x1)
                        para_bbox[3] = max(para_bbox[3], y1)

                if para_text.strip():
                    paragraphs.append({
                        'text': para_text.strip(),
                        'x': para_bbox[0],
                        'y': para_bbox[1],
                        'width': para_bbox[2] - para_bbox[0],
                        'height': para_bbox[3] - para_bbox[1],
                        'word_count': len(para_words)
                    })

    return {
        'paragraphs': paragraphs,
        'words': words
    }

def main():
    if len(sys.argv) < 4:
        print(json.dumps({'error': 'Usage: pdf_processor.py <command> <pdf_path> <output_dir> [page_index]'}))
        sys.exit(1)

    command = sys.argv[1]
    pdf_path = sys.argv[2]
    output_dir = sys.argv[3]

    try:
        if command == 'analyze':
            # Analyze pages for double page detection
            page_structure = analyze_pages(pdf_path)
            print(json.dumps({
                'success': True,
                'page_structure': page_structure
            }))

        elif command == 'process_page':
            # Process single page
            page_index = int(sys.argv[4])
            output_page_number = int(sys.argv[5])
            result = process_single_page(pdf_path, page_index, output_page_number, output_dir)
            print(json.dumps({
                'success': True,
                'result': result
            }))

        elif command == 'process_double_page':
            # Process double page (split into two)
            page_index = int(sys.argv[4])
            start_page_number = int(sys.argv[5])
            results = process_double_page(pdf_path, page_index, start_page_number, output_dir)
            print(json.dumps({
                'success': True,
                'results': results
            }))

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
