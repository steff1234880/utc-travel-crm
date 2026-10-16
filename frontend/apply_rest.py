import os

file_path = r'c:\Users\Stefin\OneDrive\Desktop\business crm\frontend\src\pages\public\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">',
    '<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center reveal-on-scroll">'
)

content = content.replace(
    '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">',
    '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 reveal-on-scroll reveal-delay-100">'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
