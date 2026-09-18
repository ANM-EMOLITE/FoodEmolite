import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2, inject } from '@angular/core';

/**
 * Tooltip đơn giản, tự tạo DOM (không phụ thuộc thư viện ngoài): hiện khi hover, mất khi rời chuột.
 * Dùng: <span appTooltip="Nội dung tooltip">...</span>. Bỏ trống (hoặc null) thì không hiện gì cả.
 */
@Directive({
    selector: '[appTooltip]',
    standalone: true
})
export class TooltipDirective implements OnDestroy {
    @Input('appTooltip') text: string | null | undefined = '';

    private readonly el = inject(ElementRef<HTMLElement>);
    private readonly renderer = inject(Renderer2);
    private tooltipEl: HTMLElement | null = null;

    @HostListener('mouseenter')
    onMouseEnter(): void {
        this.show();
    }

    @HostListener('mouseleave')
    onMouseLeave(): void {
        this.hide();
    }

    @HostListener('window:scroll')
    onWindowScroll(): void {
        this.hide();
    }

    private show(): void {
        if (this.tooltipEl || !this.text) {
            return;
        }

        const tooltip = this.renderer.createElement('div') as HTMLElement;
        this.renderer.addClass(tooltip, 'app-tooltip');
        this.renderer.appendChild(tooltip, this.renderer.createText(this.text));
        this.renderer.appendChild(document.body, tooltip);

        const hostRect = this.el.nativeElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = hostRect.top - tooltipRect.height - 8;
        let left = hostRect.left + hostRect.width / 2 - tooltipRect.width / 2;

        if (top < 4) {
            top = hostRect.bottom + 8;
        }

        left = Math.min(Math.max(left, 4), window.innerWidth - tooltipRect.width - 4);

        this.renderer.setStyle(tooltip, 'top', `${top}px`);
        this.renderer.setStyle(tooltip, 'left', `${left}px`);

        this.tooltipEl = tooltip;
    }

    private hide(): void {
        if (this.tooltipEl) {
            this.renderer.removeChild(document.body, this.tooltipEl);
            this.tooltipEl = null;
        }
    }

    ngOnDestroy(): void {
        this.hide();
    }
}
