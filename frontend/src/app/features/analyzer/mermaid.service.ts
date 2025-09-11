import { Injectable } from '@angular/core';
import mermaid from 'mermaid';

@Injectable({ providedIn: 'root' })
export class MermaidService {
  private initialized = false;
  private renderIdCounter = 0;

  initializeOnce(): void {
    if (this.initialized) return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'default',
      flowchart: { curve: 'basis' }
    });
    this.initialized = true;
  }

  private sanitize(diagram: string): string {
    if (!diagram) return '';
    
    console.log('Original diagram:', JSON.stringify(diagram));
    
    // Clean up the diagram string
    let cleaned = diagram.trim();
    
    // Remove any leading/trailing quotes if present
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    
    // Unescape any escaped characters
    cleaned = cleaned.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    
    console.log('After cleaning:', JSON.stringify(cleaned));
    
    // Find the actual diagram content starting from graph/flowchart
    const match = cleaned.match(/\b(graph|flowchart)\b[\s\S]*$/i);
    let trimmed = (match ? match[0] : cleaned).trim();
    
    console.log('After matching:', JSON.stringify(trimmed));
    
    // Fix invalid Mermaid syntax from backend
    // Convert |Components|> to proper Mermaid syntax
    trimmed = trimmed.replace(/\|([^|]+)\|>/g, '|$1|');
    
    console.log('After fixing |Components|>:', JSON.stringify(trimmed));
    
    // Fix other common syntax issues
    // 1) Normalize arrow syntax like "- - >", "-- >", "--> " → " --> "
    trimmed = trimmed.replace(/-\s*-\s*>/g, ' --> ');
    // 2) Ensure proper spacing around complete arrows
    trimmed = trimmed.replace(/\s*-->\s*/g, ' --> ');
    // 3) Normalize standalone double-dashes that are NOT part of an arrow
    //    Add spaces around "--" only when not immediately followed by ">"
    trimmed = trimmed.replace(/\s*--(?!>)\s*/g, ' -- ');
    
    console.log('After fixing arrows:', JSON.stringify(trimmed));
    
    // Handle line breaks properly - don't add extra breaks if they already exist
    if (!trimmed.includes('\n')) {
      trimmed = trimmed.replace(/;\s*/g, ';\n  ');
    } else {
      // Clean up existing line breaks and ensure proper indentation
      const lines = trimmed.split('\n');
      const cleanedLines = lines.map((line, index) => {
        const trimmedLine = line.trim();
        if (index === 0) return trimmedLine; // Keep first line as is
        if (trimmedLine === '') return ''; // Keep empty lines
        return '  ' + trimmedLine; // Indent other lines
      });
      trimmed = cleanedLines.join('\n');
    }
    
    console.log('Final sanitized diagram:', JSON.stringify(trimmed));
    
    return trimmed;
  }

  extractFromRaw(raw: string | undefined | null): string {
    if (!raw) return '';
    
    // First try to extract from code blocks
    let match = raw.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
    let inner = match && match[1] ? match[1].trim() : '';
    
    // If no code block found, try to extract from JSON structure
    if (!inner) {
      try {
        const jsonMatch = raw.match(/"mermaid":\s*"([^"]+)"/i);
        if (jsonMatch && jsonMatch[1]) {
          inner = jsonMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      } catch (e) {
        // If JSON parsing fails, try to find mermaid content directly
        const directMatch = raw.match(/(?:mermaid|graph|flowchart)[\s\S]*$/i);
        if (directMatch) {
          inner = directMatch[0];
        }
      }
    }
    
    return this.sanitize(inner);
  }

  async render(diagram: string): Promise<string> {
    if (!diagram) return '';
    this.initializeOnce();
    const id = `mermaid-diagram-${++this.renderIdCounter}`;
    const sanitized = this.sanitize(diagram);
    
    console.log('Mermaid service - Original diagram:', diagram);
    console.log('Mermaid service - Sanitized diagram:', sanitized);
    
    // Validate diagram first to provide clearer errors
    try {
      mermaid.parse(sanitized);
      console.log('Mermaid parse successful');
    } catch (e: any) {
      console.error('Mermaid parse error:', e);
      throw new Error(`Mermaid parse error: ${e?.message || e}`);
    }
    
    try {
      const { svg } = await mermaid.render(id, sanitized);
      console.log('Mermaid render successful, SVG length:', svg.length);
      return svg;
    } catch (e: any) {
      console.error('Mermaid render error:', e);
      throw new Error(`Mermaid render error: ${e?.message || e}`);
    }
  }
}


