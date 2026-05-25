import os
import re
import glob

views_dir = 'src/views'
files = glob.glob(os.path.join(views_dir, '*.vue'))

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Skip if already teleported (just to be safe)
    if '<Teleport to="body">' in content:
        print(f"Skipping {filepath} - already has Teleport")
        continue

    # We need to find every modal. Modals start with:
    # <div v-if="..." class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
    # And end with the matching </div>.
    # A simple regex won't match balanced tags, so we'll do a line-by-line replacement for the starting tags and closing tags.
    
    # Actually, we can use a simpler approach since we know the structure:
    # 1. Replace the wrapper div start
    
    def replace_wrapper(match):
        v_if = match.group(1)
        classes = match.group(2)
        # return teleport + new wrapper
        return f'<Teleport to="body">\n    <div v-if="{v_if}" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">'
    
    # match `<div v-if="..." class="fixed inset-0... ">`
    pattern_wrapper = r'<div\s+v-if="([^"]+)"\s+class="fixed inset-0[^"]*bg-gray-900[^"]*">'
    
    # But wait, if I replace the opening tag with <Teleport...><div...>, I MUST insert </Teleport> after the closing </div>!
    # Because balancing HTML in regex is impossible, I will use Python's HTMLParser or a simple stack to find the closing tag.
    
    new_content = ""
    i = 0
    while i < len(content):
        # find next modal start
        match = re.search(r'<div\s+v-if="([^"]+)"\s+class="fixed inset-0[^"]*bg-gray-900[^"]*">', content[i:])
        if not match:
            new_content += content[i:]
            break
            
        start_idx = i + match.start()
        end_idx = i + match.end()
        
        # append everything up to start
        new_content += content[i:start_idx]
        
        # append the new start
        v_if = match.group(1)
        new_content += f'<Teleport to="body">\n    <div v-if="{v_if}" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">'
        
        # now we need to find the matching closing </div>
        # we start searching from end_idx
        stack = 1
        j = end_idx
        while j < len(content) and stack > 0:
            if content.startswith('<div', j):
                stack += 1
                j += 4
            elif content.startswith('</div', j):
                stack -= 1
                j += 5
                # find the closing >
                while j < len(content) and content[j] != '>':
                    j += 1
                j += 1
            else:
                j += 1
                
        # j is now just after the matching closing </div>
        # we append the inner content, then the closing Teleport
        
        inner_content = content[end_idx:j]
        
        # Also replace inside inner_content:
        # max-h-[90vh] -> max-h-full
        inner_content = re.sub(r'max-h-\[90vh\]', 'max-h-full', inner_content)
        # p-6 -> p-6 md:px-10
        inner_content = inner_content.replace('p-6 ', 'p-6 md:px-10 ')
        inner_content = inner_content.replace('p-6\n', 'p-6 md:px-10\n')
        inner_content = inner_content.replace('p-6"', 'p-6 md:px-10"')
        
        new_content += inner_content + '\n    </Teleport>'
        
        i = j

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

