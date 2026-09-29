import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, firstValueFrom, map, Observable, shareReplay, tap } from 'rxjs';
import { AdministrativeUnit, GeocodeLocation, ReverseGeocodeResult } from '../models/address.model';
import { normalizeAdminUnitName } from '../utils/vn-text';

/** Danh mục đơn vị hành chính VN open-source (2 cấp sau sáp nhập) — https://provinces.open-api.vn */
const PROVINCES_API = 'https://provinces.open-api.vn/api/v2';

/** Geocode open-source dựa trên OpenStreetMap — https://photon.komoot.io */
const PHOTON_REVERSE_API = 'https://photon.komoot.io/reverse';
const PHOTON_SEARCH_API = 'https://photon.komoot.io/api/';

/** Chỉ tìm trong lãnh thổ Việt Nam (minLon, minLat, maxLon, maxLat). */
const VN_BBOX = '102.1,8.3,109.5,23.4';

interface OpenApiUnit {
    code: number;
    name: string;
}

interface OpenApiProvinceDetail extends OpenApiUnit {
    wards: OpenApiUnit[];
}

interface PhotonResponse {
    features: {
        geometry: { coordinates: [number, number] };
        properties: {
            housenumber?: string;
            street?: string;
            name?: string;
            district?: string;
            locality?: string;
            city?: string;
            county?: string;
            state?: string;
        };
    }[];
}

/**
 * Gọi thẳng các API open-source ở trên (không qua BE). Danh mục ít thay đổi nên cache lại trong phiên;
 * lỗi thì bỏ cache để lần sau gọi lại.
 */
@Injectable({
    providedIn: 'root'
})
export class AddressService {
    private readonly http = inject(HttpClient);

    private provinces$?: Observable<AdministrativeUnit[]>;
    private readonly wardsCache = new Map<string, Observable<AdministrativeUnit[]>>();

    getProvinces(): Observable<AdministrativeUnit[]> {
        this.provinces$ ??= this.http.get<OpenApiUnit[]>(`${PROVINCES_API}/p/`).pipe(
            map(items => items.map(toUnit)),
            tap({ error: () => (this.provinces$ = undefined) }),
            shareReplay(1)
        );

        return this.provinces$;
    }

    getWards(provinceCode: string): Observable<AdministrativeUnit[]> {
        let wards$ = this.wardsCache.get(provinceCode);

        if (!wards$) {
            wards$ = this.http.get<OpenApiProvinceDetail>(`${PROVINCES_API}/p/${Number(provinceCode)}`, { params: { depth: 2 } }).pipe(
                map(detail => detail.wards.map(toUnit).sort((a, b) => a.name.localeCompare(b.name, 'vi'))),
                tap({ error: () => this.wardsCache.delete(provinceCode) }),
                shareReplay(1)
            );

            this.wardsCache.set(provinceCode, wards$);
        }

        return wards$;
    }

    reverseGeocode(latitude: number, longitude: number): Observable<ReverseGeocodeResult | null> {
        return this.http.get<PhotonResponse>(PHOTON_REVERSE_API, { params: { lat: latitude, lon: longitude } }).pipe(
            map(res => {
                const p = res.features?.[0]?.properties;

                if (!p) return null;

                return {
                    provinceCandidates: compact([p.city, p.state, p.county]),
                    // city có khi là cấp xã (vd: "Phú Quốc" -> Đặc khu Phú Quốc) nên cũng thử khớp
                    wardCandidates: compact([p.district, p.locality, p.city, p.county]),
                    street: compact([p.housenumber, p.street]).join(' ')
                };
            })
        );
    }

    /**
     * Tìm vị trí gần đúng theo địa chỉ chữ để đặt ghim sẵn (khách kéo lại cho đúng nhà).
     * Photon tìm mờ (vd: "Long Bình" có thể ra "Bình Long") nên chỉ nhận kết quả đúng tên Phường,
     * thử lần lượt: đường + phường -> phường -> tên đầy đủ; không được thì lùi về mức Tỉnh.
     */
    locateAddress(provinceName: string, wardName: string | null, street: string): Observable<GeocodeLocation | null> {
        return defer(async () => {
            const province = normalizeAdminUnitName(provinceName);

            if (wardName) {
                const ward = normalizeAdminUnitName(wardName);
                const tries: [string, number][] = [];

                if (street.trim()) tries.push([`${street.trim()}, ${ward}, ${province}`, 17]);
                tries.push([`${ward}, ${province}`, 15], [`${wardName}, ${provinceName}`, 15]);

                for (const [query, zoom] of tries) {
                    const hit = (await this.search(query)).find(f => isInWard(f.properties, ward));

                    if (hit) return toLocation(hit, zoom);
                }
            }

            const provinceHit = (await this.search(provinceName))[0];

            return provinceHit ? toLocation(provinceHit, 11) : null;
        });
    }

    private async search(query: string): Promise<PhotonResponse['features']> {
        const res = await firstValueFrom(
            this.http.get<PhotonResponse>(PHOTON_SEARCH_API, { params: { q: query, limit: 5, bbox: VN_BBOX } })
        );

        return res.features ?? [];
    }
}

type PhotonFeature = PhotonResponse['features'][number];

function isInWard(p: PhotonFeature['properties'], normalizedWard: string): boolean {
    return [p.district, p.name, p.locality, p.city, p.county]
        .some(x => !!x && normalizeAdminUnitName(x) === normalizedWard);
}

function toLocation(feature: PhotonFeature, zoom: number): GeocodeLocation {
    const [longitude, latitude] = feature.geometry.coordinates;

    return { latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)), zoom };
}

function toUnit(item: OpenApiUnit): AdministrativeUnit {
    return { code: String(item.code), name: item.name };
}

function compact(values: (string | undefined)[]): string[] {
    return values.map(x => x?.trim() ?? '').filter(Boolean);
}
