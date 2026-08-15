import os
from PIL import Image, ImageDraw

def create_pwa_icon(size, output_path):
    # Create image with warm light beige background and rounded rectangle badge
    img = Image.new('RGBA', (size, size), (252, 251, 247, 255))
    draw = ImageDraw.Draw(img)
    
    # Outer margin and golden yellow rounded badge
    margin = int(size * 0.08)
    corner_radius = int(size * 0.22)
    badge_rect = [margin, margin, size - margin, size - margin]
    
    # Gradient/Solid Golden Yellow Badge (#f59e0b)
    draw.rounded_rectangle(badge_rect, radius=corner_radius, fill=(245, 158, 11, 255))
    
    # Draw Film Reel / Play icon in dark stone (#1c1917)
    center_x = size // 2
    center_y = size // 2
    
    # Main TV Screen Box inside badge
    screen_w = int(size * 0.44)
    screen_h = int(size * 0.36)
    screen_left = center_x - (screen_w // 2)
    screen_top = center_y - (screen_h // 2) + int(size * 0.02)
    screen_rect = [screen_left, screen_top, screen_left + screen_w, screen_top + screen_h]
    
    draw.rounded_rectangle(screen_rect, radius=int(size * 0.06), fill=(28, 25, 23, 255))
    
    # Play Triangle inside Screen Box (#fef3c7)
    tri_w = int(size * 0.12)
    tri_h = int(size * 0.14)
    p1 = (center_x - tri_w // 3, center_y - tri_h // 2 + int(size * 0.02))
    p2 = (center_x - tri_w // 3, center_y + tri_h // 2 + int(size * 0.02))
    p3 = (center_x + tri_w * 2 // 3, center_y + int(size * 0.02))
    draw.polygon([p1, p2, p3], fill=(254, 243, 199, 255))
    
    # Antenna lines on top of TV
    ant_w = int(size * 0.04)
    draw.line([(center_x - int(size * 0.08), screen_top - int(size * 0.08)), (center_x, screen_top)], fill=(28, 25, 23, 255), width=ant_w)
    draw.line([(center_x + int(size * 0.08), screen_top - int(size * 0.08)), (center_x, screen_top)], fill=(28, 25, 23, 255), width=ant_w)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG')
    print(f"Generated PWA Icon: {output_path} ({size}x{size})")

static_dir = '/Users/biplav/.gemini/antigravity-ide/scratch/binge-tracker/static'
create_pwa_icon(192, os.path.join(static_dir, 'pwa-192x192.png'))
create_pwa_icon(512, os.path.join(static_dir, 'pwa-512x512.png'))
create_pwa_icon(192, os.path.join(static_dir, 'icon-192x192.png'))
create_pwa_icon(512, os.path.join(static_dir, 'icon-512x512.png'))
create_pwa_icon(180, os.path.join(static_dir, 'apple-touch-icon.png'))
create_pwa_icon(64, os.path.join(static_dir, 'favicon.png'))
