import os
from PIL import Image
import glob

# Swap gallery-1 and gallery-4
if os.path.exists('gallery-1.jpeg') and os.path.exists('gallery-4.jpeg'):
    os.rename('gallery-1.jpeg', 'temp.jpeg')
    os.rename('gallery-4.jpeg', 'gallery-1.jpeg')
    os.rename('temp.jpeg', 'gallery-4.jpeg')
    print("Swapped gallery-1 and gallery-4")

# Convert to WebP
jpegs = glob.glob('gallery-*.jpeg')
for jpeg in jpegs:
    webp_name = jpeg.replace('.jpeg', '.webp')
    img = Image.open(jpeg)
    img.save(webp_name, 'webp', quality=85)
    os.remove(jpeg)
    print(f"Converted {jpeg} to {webp_name}")
