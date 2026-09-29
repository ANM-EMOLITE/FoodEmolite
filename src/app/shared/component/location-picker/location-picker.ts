import { AfterViewInit, Component, effect, ElementRef, input, OnDestroy, output, viewChild } from '@angular/core';
import type * as Leaflet from 'leaflet';

export interface PickedLocation {
    latitude: number;
    longitude: number;
}

/** Toàn Việt Nam — hiển thị khi chưa có ghim. */
const VN_CENTER: [number, number] = [16.0, 106.5];
const VN_ZOOM = 5;

const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24">
  <path fill="#7c3aed" stroke="#ffffff" stroke-width="1.5"
    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
  <circle cx="12" cy="9" r="2.6" fill="#ffffff"/>
</svg>`;

/**
 * Bản đồ chọn vị trí (Leaflet + OpenStreetMap, open-source, không cần API key).
 * Khách kéo ghim hoặc chạm vào bản đồ để đặt đúng vị trí -> phát (picked).
 * Leaflet được tải lazy khi component hiển thị để không làm nặng bundle ban đầu.
 */
@Component({
    selector: 'app-location-picker',
    template: `<div #mapEl class="relative z-0 h-full w-full"></div>`,
    host: { class: 'block' }
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
    readonly latitude = input<number | null>(null);
    readonly longitude = input<number | null>(null);
    /** Mức zoom khi ghim được đặt từ bên ngoài (GPS / tìm theo địa chỉ). */
    readonly zoom = input(16);

    readonly picked = output<PickedLocation>();

    private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

    private L?: typeof Leaflet;
    private map?: Leaflet.Map;
    private marker?: Leaflet.Marker;
    private resizeObserver?: ResizeObserver;
    /** Vị trí khách vừa tự chọn — khi input đổi về đúng vị trí này thì không kéo bản đồ theo (tránh nhảy zoom). */
    private lastPicked: PickedLocation | null = null;
    private destroyed = false;

    constructor() {
        effect(() => this.syncMarker(this.latitude(), this.longitude(), this.zoom()));
    }

    async ngAfterViewInit(): Promise<void> {
        const module = await import('leaflet');
        const L = ((module as unknown as { default?: typeof Leaflet }).default ?? module) as typeof Leaflet;

        if (this.destroyed) return;

        this.L = L;
        this.map = L.map(this.mapEl().nativeElement, { zoomControl: true, attributionControl: true })
            .setView(VN_CENTER, VN_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        }).addTo(this.map);

        this.map.on('click', event => this.emitPicked(event.latlng));

        // Bản đồ nằm trong popup — kích thước chỉ đúng sau khi popup render xong / đổi kích thước
        this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
        this.resizeObserver.observe(this.mapEl().nativeElement);

        this.syncMarker(this.latitude(), this.longitude(), this.zoom());
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.resizeObserver?.disconnect();
        this.map?.remove();
    }

    private syncMarker(latitude: number | null, longitude: number | null, zoom: number): void {
        const L = this.L;
        const map = this.map;

        if (!L || !map) return;

        if (latitude === null || longitude === null) {
            this.marker?.remove();
            this.marker = undefined;
            return;
        }

        const isOwnPick = this.lastPicked?.latitude === latitude && this.lastPicked?.longitude === longitude;

        if (!this.marker) {
            this.marker = L.marker([latitude, longitude], {
                draggable: true,
                icon: L.divIcon({ html: PIN_SVG, className: '', iconSize: [34, 34], iconAnchor: [17, 33] })
            }).addTo(map);

            this.marker.on('dragend', () => this.emitPicked(this.marker!.getLatLng()));
        } else {
            this.marker.setLatLng([latitude, longitude]);
        }

        if (!isOwnPick) {
            map.setView([latitude, longitude], zoom);
        }
    }

    private emitPicked(latlng: Leaflet.LatLng): void {
        const location: PickedLocation = {
            latitude: Number(latlng.lat.toFixed(6)),
            longitude: Number(latlng.lng.toFixed(6))
        };

        this.lastPicked = location;
        this.marker?.setLatLng([location.latitude, location.longitude]);
        this.picked.emit(location);
    }
}
