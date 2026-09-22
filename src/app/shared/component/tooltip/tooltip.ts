import { Component, ElementRef, Input, OnDestroy, ViewChild, inject } from '@angular/core';

/**
 * Text 1 dòng tự cắt bớt (truncate "...") và chỉ hiện tooltip đầy đủ khi thật sự bị cắt.
 * Dùng: <app-tooltip [text]="giaTri" />. Nội dung ngắn, không bị cắt thì hover không hiện gì.
 *
 * Tooltip vẽ thẳng vào document.body (position: fixed) nên không bị overflow của bảng/khung cha cắt mất;
 * kiểu dáng dùng chung class .app-tooltip trong styles.css.
 */
@Component({
  selector: 'app-tooltip',
  standalone: true,
  host: { class: 'block min-w-0' },
  template: `<span
    #label
    class="block truncate"
    (mouseenter)="show()"
    (mouseleave)="hide()">{{ text }}</span>`
})
export class TooltipComponent implements OnDestroy {
  @Input() text: string | null | undefined = '';

  @ViewChild('label', { static: true }) private label!: ElementRef<HTMLElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  private tooltipEl: HTMLElement | null = null;

  /** Text có đang bị cắt (scrollWidth vượt clientWidth) hay không. */
  isTruncated(): boolean {
    const el = this.label.nativeElement;

    return el.scrollWidth > el.clientWidth;
  }

  show(): void {
    if (this.tooltipEl || !this.text || !this.isTruncated()) {
      return;
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'app-tooltip';
    tooltip.textContent = this.text;
    document.body.appendChild(tooltip);

    const hostRect = (this.host.nativeElement as HTMLElement).getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = hostRect.top - tooltipRect.height - 8;
    let left = hostRect.left + Math.min(hostRect.width, 240) / 2 - tooltipRect.width / 2;

    if (top < 4) {
      top = hostRect.bottom + 8;
    }

    left = Math.min(Math.max(left, 4), window.innerWidth - tooltipRect.width - 4);

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    this.tooltipEl = tooltip;

    window.addEventListener('scroll', this.hideOnScroll, true);
  }

  hide(): void {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }

    window.removeEventListener('scroll', this.hideOnScroll, true);
  }

  // scroll bất kỳ (kể cả trong khung cuộn của bảng) đều ẩn tooltip để nó không "lơ lửng" sai chỗ.
  private readonly hideOnScroll = (): void => this.hide();

  ngOnDestroy(): void {
    this.hide();
  }
}
