import os

file_path = r'c:\Users\Stefin\OneDrive\Desktop\business crm\backend\prisma\schema.prisma'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add dynamicSections to HomepageContent
if 'dynamicSections Json?' not in content:
    content = content.replace('mapImage         String?', 'mapImage         String?\n    dynamicSections  Json?')

# Add PackagesPageContent model
if 'model PackagesPageContent' not in content:
    content += '''
model PackagesPageContent {
  id               String   @id @default("default")
  heroTitle        String   @default("Our Curated Packages")
  heroSubtitle     String   @default("Explore our exclusive travel packages and find your next adventure.")
  heroImage        String   @default("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1600")
  heroActive       Boolean  @default(true)
  dynamicSections  Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
'''

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated schema.prisma")
