import { Component, effect, signal, inject, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyzerService } from './analyzer.service';
import { MermaidService } from './mermaid.service';
import svgPanZoom from 'svg-pan-zoom';

@Component({
  selector: 'app-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analyzer.component.html',
  styleUrls: ['./analyzer.component.scss']
})
export class AnalyzerComponent implements OnInit, AfterViewInit {

  @ViewChild('mermaidContainer', { static: false }) mermaidContainer?: ElementRef;




  repositoryUrl = 'https://github.com/gothinkster/angular-realworld-example-app';
  loading = signal(false);
  error = signal('');
  mermaidText = signal('');
  rawText = signal('');
  insights = signal<string[]>([]);
  techStack = signal<string[]>([]);
  architecture = signal('');
  analysisDuration = signal<number>(0);
  private mermaid = inject(MermaidService);
  private panZoom: any;

  private analyzerService = inject(AnalyzerService);

  constructor(){}

  formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`;
  }

  ngOnInit(): void {
    // Initialize Mermaid once
    this.mermaid.initializeOnce();
    // Attempt initial render if data already present
    void this.renderDiagram();
  }

  ngAfterViewInit() {
    // Test with sample data (you can remove this after testing)
    this.testMermaidRendering();
  }

  private async renderDiagram(): Promise<void> {
    const container = this.mermaidContainer?.nativeElement;
    if (!container) {
      console.log('Container not available for rendering');
      return;
    }

    let diagram = this.mermaidText();
    if (!diagram) {
      console.log('No diagram to render');
      container.innerHTML = '';
      return;
    }

    diagram = this.sanitizeDiagram(diagram);

    try {
      console.log('Rendering diagram:', diagram);
      // Clear container first
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Rendering diagram...</div>';

      const svg = await this.mermaid.render(diagram);
      // Replace content with SVG
      container.innerHTML = svg;

      // Initialize pan/zoom on the SVG
      const svgEl = container.querySelector('svg') as SVGSVGElement | null;
      if (svgEl) {
        // Ensure SVG scales to container
        svgEl.setAttribute('width', '100%');
        svgEl.setAttribute('height', '100vh');
        // Destroy previous instance if any
        if (this.panZoom && typeof this.panZoom.destroy === 'function') {
          this.panZoom.destroy();
        }
        this.panZoom = svgPanZoom(svgEl, {
          zoomEnabled: true,
          panEnabled: true,
          controlIconsEnabled: false,
          fit: true,
          center: true,
          minZoom: 0.2,
          maxZoom: 10,
          zoomScaleSensitivity: 0.4,
          contain: true
        });
        // After layout
        setTimeout(() => {
          try {
            this.panZoom && this.panZoom.resize();
            this.panZoom && this.panZoom.fit();
            this.panZoom && this.panZoom.center();
          } catch {}
        }, 0);
      }
      console.log('Diagram rendered successfully');
    } catch (err: any) {
      console.error('Mermaid render error:', err);
      container.innerHTML = `<div style='color:red; padding: 10px; border: 1px solid #ff6b6b; border-radius: 4px; background: #ffe0e0;'>Mermaid render error: ${err?.message || err}</div>`;
    }
  }

  private sanitizeDiagram(diagram: string): string {
    // Fix common arrow typos: '-- >' to '-->'
    return diagram.replace(/--\s*>/g, '-->');
  }


  // Effect to handle diagram rendering when data changes
  private renderEffect = effect(() => {
    const diagram = this.mermaidText();
    const raw = this.rawText();

    console.log('Effect triggered - diagram:', diagram, 'raw:', raw);

    // Use setTimeout to ensure ViewChild is available
    setTimeout(() => {
      if (this.mermaidContainer?.nativeElement) {
        if (diagram) {
          console.log('Rendering Mermaid diagram:', diagram);
          this.renderDiagram();
        } else if (raw) {
          // Try to extract diagram from raw text
          const extracted = this.mermaid.extractFromRaw(raw);
          if (extracted) {
            console.log('Extracted diagram from raw text:', extracted);
            this.mermaidText.set(extracted);
          } else {
            this.mermaidContainer.nativeElement.innerHTML = '';
          }
        } else {
          this.mermaidContainer.nativeElement.innerHTML = '';
        }
      } else {
        console.log('Mermaid container not available yet');
      }
    }, 0);
  });

  zoomIn() {
    try { this.panZoom && this.panZoom.zoomIn(); } catch {}
  }
  zoomOut() {
    try { this.panZoom && this.panZoom.zoomOut(); } catch {}
  }
  resetView() {
    try {
      if (this.panZoom) {
        this.panZoom.reset();
        this.panZoom.fit();
        this.panZoom.center();
      }
    } catch {}
  }

  // Test method - remove this after confirming it works
  private testMermaidRendering() {
    const testDiagram = `
      flowchart TD
        A[Christmas] -->|Get money| B(Go shopping)
        B --> C{Let me think}
        C -->|One| D[Laptop]
        C -->|Two| E[iPhone]
        C -->|Three| F[fa:fa-car Car]
    `;
    console.log('Testing with sample diagram:', testDiagram);

    setTimeout(() => {
      this.mermaidText.set(testDiagram);
      this.rawText.set('Test raw data');
    }, 2000);
  }

  analyze() {
    this.loading.set(true);
    this.error.set('');
    this.mermaidText.set('');
    this.rawText.set('');
    this.insights.set([]);
    this.techStack.set([]);
    this.architecture.set('');
    this.analysisDuration.set(0);

    const url = this.repositoryUrl;
    if (!/^https?:\/\/github\.com\//i.test(url)) {
      this.error.set('Enter a valid GitHub URL like https://github.com/owner/repo');
      this.loading.set(false);
      return;
    }

    this.analyzerService.analyzeRepository(url).subscribe({
      next: (data) => {
        console.log('Received data from backend:', data);
        if (!data?.success) {
          throw new Error(data?.message || data?.error || 'Request failed');
        }
        
        // Set all data from the response
        this.mermaidText.set(data.data?.mermaid || '');
        this.rawText.set(data.data?.raw || '');
        this.insights.set(data.data?.insights || []);
        this.techStack.set(data.data?.techStack || []);
        this.architecture.set(data.data?.architecture || '');
        this.analysisDuration.set(data.metadata?.analysisDuration || 0);
        
        // Render diagram
        setTimeout(() => {
          void this.renderDiagram();
        }, 100);
      },
      error: (err) => {
        console.error('Analysis error:', err);
        this.error.set(err.message);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}


