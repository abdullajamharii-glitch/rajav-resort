import os
from PIL import Image

def optimize_image(filepath, max_width=None, quality=70):
    img = Image.open(filepath)
    orig_size = os.path.getsize(filepath)
    
    if max_width and img.width > max_width:
        ratio = max_width / float(img.width)
        new_height = int(float(img.height) * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        print(f"Resized {filepath} from {img.width}/{img.height} to {max_width}/{new_height}")
    
    img.save(filepath, 'webp', quality=quality, method=6) # method=6 is slower but higher compression
    new_size = os.path.getsize(filepath)
    print(f"Optimized {filepath}: {orig_size} bytes -> {new_size} bytes (saved {orig_size - new_size} bytes, {((orig_size - new_size)/orig_size)*100:.1f}%)")

# List of files to compress and potentially resize
# about-story
optimize_image('about-story-480w.webp', quality=65)
optimize_image('about-story-768w.webp', quality=65)
optimize_image('about-story.webp', quality=65)

# entire-resort
optimize_image('entire-resort-480w.webp', quality=65)
optimize_image('entire-resort-768w.webp', quality=65)
optimize_image('entire-resort.webp', quality=65)

# room images: resize to 600px max width and compress
optimize_image('room-jacuzzi.webp', max_width=600, quality=65)
optimize_image('room-beach-view.webp', max_width=600, quality=65)
optimize_image('room-balcony.webp', max_width=600, quality=65)
optimize_image('room-economy.webp', max_width=600, quality=65)
optimize_image('bathroom.webp', max_width=600, quality=65)
optimize_image('hero-bg-mobile.webp', quality=65)
optimize_image('hero-bg.webp', quality=65)
