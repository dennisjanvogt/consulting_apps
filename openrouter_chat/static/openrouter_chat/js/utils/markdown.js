class MarkdownParser {
  constructor() {
    // Configure marked options
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        highlight: function(code, lang) {
          if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              console.error('Highlight error:', err);
            }
          }
          return code;
        },
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        sanitize: false
      });
    }
  }
  
  parse(text) {
    if (!text) return '';
    
    // If marked is available, use it for full markdown support
    if (typeof marked !== 'undefined') {
      try {
        const html = marked.parse(text);
        // Apply syntax highlighting to any code blocks that weren't highlighted
        return this.highlightCodeBlocks(html);
      } catch (err) {
        console.error('Markdown parse error:', err);
        // Fallback to basic parsing
        return this.basicParse(text);
      }
    }
    
    // Fallback to basic parsing if marked is not available
    return this.basicParse(text);
  }
  
  highlightCodeBlocks(html) {
    if (typeof hljs === 'undefined') return html;
    
    // Create a temporary container to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Find all code blocks
    temp.querySelectorAll('pre code').forEach((block) => {
      // Skip if already highlighted
      if (block.classList.contains('hljs')) return;
      
      // Try to detect language from class
      const className = block.className;
      const langMatch = className.match(/language-(\w+)/);
      
      if (langMatch && langMatch[1]) {
        try {
          const result = hljs.highlight(block.textContent, { language: langMatch[1] });
          block.innerHTML = result.value;
          block.classList.add('hljs');
        } catch (err) {
          // If language not supported, try auto-detection
          try {
            const result = hljs.highlightAuto(block.textContent);
            block.innerHTML = result.value;
            block.classList.add('hljs');
          } catch (autoErr) {
            console.error('Auto-highlight error:', autoErr);
          }
        }
      } else {
        // Auto-detect language
        try {
          const result = hljs.highlightAuto(block.textContent);
          block.innerHTML = result.value;
          block.classList.add('hljs');
        } catch (err) {
          console.error('Auto-highlight error:', err);
        }
      }
    });
    
    return temp.innerHTML;
  }
  
  basicParse(text) {
    // Basic markdown parsing as fallback
    let html = text;
    
    // Escape HTML
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      if (typeof hljs !== 'undefined' && lang) {
        try {
          const highlighted = hljs.highlight(code.trim(), { language: lang }).value;
          return `<pre><code class="language-${lang} hljs">${highlighted}</code></pre>`;
        } catch (err) {
          // Fallback if language not supported
        }
      }
      return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
    });
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    
    // Handle lists
    html = html.replace(/(<li>.*?<\/li>)\s*(?=<li>|$)/gs, (match) => {
      if (!match.includes('<ul>') && !match.includes('<ol>')) {
        return '<ul>' + match + '</ul>';
      }
      return match;
    });
    
    return html;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.Markdown = new MarkdownParser();