export interface GeoCity {
  name: string;
}

export interface GeoCountry {
  code: string;
  name: string;
}

export interface GeoContinent {
  code: string;
  name: string;
}

export interface GeoSubdivision {
  isoCode: string;
  name: string;
}

export interface IpLocation {
  accuracyRadius?: number;
  city?: GeoCity;
  continent?: GeoContinent;
  country?: GeoCountry;
  latitude?: number;
  longitude?: number;
  postalCode?: string;
  subdivisions?: GeoSubdivision[];
}

export interface IdentificationConfidence {
  score: number;           // 0 ~ 1
  revision?: string;       // 점수 계산 방안 버전
  comment?: string;
}

export interface IdentificationSeenAt {
  global: string | null;
  subscription: string | null;
}

export interface BrowserDetails {
  browserName?: string;
  browserFullVersion?: string;
  browserMajorVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  userAgent?: string;
}

export interface BotDetection {
  result: 'good' | 'bad';
  type?: string;
  userAgent?: string;
}

export interface FpjsData {
  requestId: string;
  url?: string;
  ip: string;
  tag?: string | Record<string, unknown>;
  requestType?: string;
  yourCustomId?: string;
  time?: string;        // ISO 8601
  timestamp?: number;   // UNIX time in milliseconds
  ipLocation?: IpLocation;
  linkedId?: string;
  visitorId: string;
  visitorFound: boolean;
  confidence?: IdentificationConfidence;
  firstSeenAt?: IdentificationSeenAt;
  lastSeenAt?: IdentificationSeenAt;
  browserDetails?: BrowserDetails;
  incognito?: boolean;
  clientReferrer?: string;
  bot?: BotDetection;
  // 필요하다면 rootApps, emulator, ipInfo 등 확장 가능
}

/**
 * 프린트 데이터 조회
 * @param fpRequestId 
 * @returns 
 */
export const getFpjsData = async (fpRequestId: string): Promise<FpjsData | null> => {
    try {   
        const response = await fetch(`https://${process.env.FPJS_DATA_SEARCH_URL}/${fpRequestId}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
};