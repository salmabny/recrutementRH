import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
    name: 'formatAnalysis',
    standalone: true
})
export class FormatAnalysisPipe implements PipeTransform {

    constructor(private sanitizer: DomSanitizer) { }

    transform(value: string | undefined): SafeHtml {
        if (!value) return '';

        let formatted = value;

        // 1. Identify Category Headers and wrap them (Détails, Compétences, etc.)
        const categories = ['Compétences', 'Diplôme', 'Expérience', 'Détails', 'SCORE TOTAL', 'Compatibilité par critère'];

        categories.forEach(cat => {
            const regex = new RegExp(`(^|\\n)(${cat}\\s*:)`, 'gi');
            formatted = formatted.replace(regex, '$1<div class="analysis-section-title">$2</div>');
        });

        // 2. Format Score Patterns (e.g., Compétences : 16%)
        // Ensure we don't double wrap if it's already a title
        formatted = formatted.replace(/(?<!div class="analysis-section-title">)([A-ZÉ][a-zà-ÿ]+\s*:\s*\d+(?:\.\d+)?%)/gi, '<div class="analysis-criterion-badge">$1</div>');

        // 3. Process lines for lists and paragraphs
        const lines = formatted.split('\n');
        const processedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';

            // If it's a list item (starts with - or bullet)
            if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
                const content = trimmed.substring(1).trim();
                return content ? `<li class="analysis-item">${content}</li>` : '';
            }

            // If it's already a div (title or badge), leave it
            if (trimmed.startsWith('<div')) return line;

            // Otherwise, generic paragraph
            return `<p class="analysis-paragraph">${trimmed}</p>`;
        });

        formatted = processedLines.join('');

        // 4. Wrap sequences of <li> in <ul>
        formatted = formatted.replace(/(<li class="analysis-item">.*?<\/li>)+/g, '<ul class="analysis-list">$&</ul>');

        // 5. Highlight Score Total (Premium Badge) - Final touch
        formatted = formatted.replace(/(SCORE TOTAL\s*:\s*[\d.]+%)/gi, '<div class="analysis-total-badge">$1</div>');

        return this.sanitizer.bypassSecurityTrustHtml(formatted);
    }
}
