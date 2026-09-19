/**
 * Utility for intelligent route parsing and matching.
 * Supports:
 * - Province / city alias normalization (e.g. HCM, TP.HCM, Hồ Chí Minh)
 * - Multi-ward slash-separated route cluster set matching (Set overlap / Jaccard similarity)
 * - Administrative prefix stripping (Phường, Xã, Thị trấn, TP, TX, Quận, Huyện)
 * - Residual route matching ("Các Phường/Xã khác trực thuộc...")
 */

export const PROVINCE_ALIASES: Record<string, string> = {
  hcm: 'hồ chí minh',
  'tp.hcm': 'hồ chí minh',
  'tp. hcm': 'hồ chí minh',
  tphcm: 'hồ chí minh',
  'tp hcm': 'hồ chí minh',
  'tp. hồ chí minh': 'hồ chí minh',
  'tp hồ chí minh': 'hồ chí minh',
  'thành phố hồ chí minh': 'hồ chí minh',
  'hồ chí minh': 'hồ chí minh',
  sg: 'hồ chí minh',
  'sài gòn': 'hồ chí minh',

  hn: 'hà nội',
  'tp.hn': 'hà nội',
  'tp hà nội': 'hà nội',
  'tp. hà nội': 'hà nội',
  'thành phố hà nội': 'hà nội',
  'hà nội': 'hà nội',

  đn: 'đà nẵng',
  'tp. đà nẵng': 'đà nẵng',
  'tp đà nẵng': 'đà nẵng',
  'thành phố đà nẵng': 'đà nẵng',
  'đà nẵng': 'đà nẵng',

  bd: 'bình dương',
  'tỉnh bình dương': 'bình dương',
  'bình dương': 'bình dương',

  'đồng nai': 'đồng nai',
  'tỉnh đồng nai': 'đồng nai',

  'cần thơ': 'cần thơ',
  'tp. cần thơ': 'cần thơ',
  'tp cần thơ': 'cần thơ',
  'tỉnh cần thơ': 'cần thơ',

  'lâm đồng': 'lâm đồng',
  'tỉnh lâm đồng': 'lâm đồng',

  'tây ninh': 'tây ninh',
  'tỉnh tây ninh': 'tây ninh',

  'gia lai': 'gia lai',
  'tỉnh gia lai': 'gia lai',

  'khánh hòa': 'khánh hòa',
  'tỉnh khánh hòa': 'khánh hòa',

  'đắk lắk': 'đắk lắk',
  'dak lak': 'đắk lắk',
  'tỉnh đắk lắk': 'đắk lắk',

  'đồng tháp': 'đồng tháp',
  'tỉnh đồng tháp': 'đồng tháp',

  'vĩnh long': 'vĩnh long',
  'tỉnh vĩnh long': 'vĩnh long',

  'cà mau': 'cà mau',
  'tỉnh cà mau': 'cà mau',

  'an giang': 'an giang',
  'tỉnh an giang': 'an giang',
};

export function normalizeKey(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([-/–—,])\s*/g, '$1')
    .trim();
}

export function normalizeProvince(str: string | null | undefined): string {
  if (!str) return '';
  const cleaned = str
    .toLowerCase()
    .replace(/^tỉnh\s+/i, '')
    .replace(/^thành phố\s+/i, '')
    .replace(/^tp\.?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const key = str.toLowerCase().trim();
  if (PROVINCE_ALIASES[key]) return PROVINCE_ALIASES[key];
  if (PROVINCE_ALIASES[cleaned]) return PROVINCE_ALIASES[cleaned];

  return cleaned;
}

const ADMIN_PREFIX_REGEX = /^(phường|xã|thị trấn|thị xã|tx\.?|thành phố|tp\.?|quận|huyện|q\.?|h\.?)\s+/i;

export function normalizeLocationItem(str: string | null | undefined): string {
  if (!str) return '';
  let s = str
    .toLowerCase()
    .replace(/[.,/–—\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  s = s.replace(ADMIN_PREFIX_REGEX, '').trim();
  return s;
}

export interface ParsedRoute {
  raw: string;
  normalizedFull: string;
  province: string | null;
  points: string[];
  rawPoints: string[];
  isResidual: boolean;
}

export function parseRoute(routeName: string): ParsedRoute {
  const raw = routeName ? routeName.trim() : '';
  const normalizedFull = normalizeKey(raw);

  // Check if residual route
  const isResidual =
    normalizedFull.includes('các phường/xã khác') ||
    normalizedFull.includes('các phường, xã khác') ||
    normalizedFull.includes('các xã khác') ||
    normalizedFull.includes('trực thuộc');

  if (isResidual) {
    let prov: string | null = null;
    for (const [alias, canonical] of Object.entries(PROVINCE_ALIASES)) {
      if (normalizedFull.includes(alias)) {
        prov = canonical;
        break;
      }
    }
    return {
      raw,
      normalizedFull,
      province: prov,
      points: [],
      rawPoints: [],
      isResidual: true,
    };
  }

  // Check if has hyphen dividing province and destinations
  const dashMatch = raw.match(/^([^-–—]+)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    const provincePart = dashMatch[1].trim();
    const destinationsPart = dashMatch[2].trim();

    const prov = normalizeProvince(provincePart);
    const rawPoints = destinationsPart
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean);

    const points = Array.from(
      new Set(rawPoints.map(normalizeLocationItem).filter(Boolean))
    );

    return {
      raw,
      normalizedFull,
      province: prov || normalizeKey(provincePart),
      points,
      rawPoints,
      isResidual: false,
    };
  }

  // No dash: could be single point or slash list
  const rawPoints = raw.split('/').map((p) => p.trim()).filter(Boolean);
  const points = Array.from(new Set(rawPoints.map(normalizeLocationItem).filter(Boolean)));
  const prov = normalizeProvince(raw);

  return {
    raw,
    normalizedFull,
    province: prov || null,
    points,
    rawPoints,
    isResidual: false,
  };
}

export interface MatchResult {
  matched: boolean;
  score: number;
  overlapCount: number;
  jaccard: number;
  reason: string;
}

/**
 * Compares a target route (e.g. from customer / invoice) against a candidate route (e.g. from route_groups).
 */
export function matchRouteScore(targetRoute: string, candidateRoute: string): MatchResult {
  const target = parseRoute(targetRoute);
  const cand = parseRoute(candidateRoute);

  // 1. Exact normalized match
  if (target.normalizedFull === cand.normalizedFull) {
    return {
      matched: true,
      score: 100000,
      overlapCount: Math.max(target.points.length, cand.points.length, 1),
      jaccard: 1.0,
      reason: 'exact_full_match',
    };
  }

  // 2. Residual route matching
  if (target.isResidual && cand.isResidual) {
    if (target.province && cand.province && target.province === cand.province) {
      return {
        matched: true,
        score: 50000,
        overlapCount: 1,
        jaccard: 1.0,
        reason: 'residual_province_match',
      };
    }
  }
  if (target.isResidual !== cand.isResidual) {
    return { matched: false, score: 0, overlapCount: 0, jaccard: 0, reason: 'residual_mismatch' };
  }

  // 3. Check province compatibility if both are specified
  if (target.province && cand.province) {
    const provT = normalizeProvince(target.province);
    const provC = normalizeProvince(cand.province);
    if (provT !== provC) {
      return { matched: false, score: 0, overlapCount: 0, jaccard: 0, reason: 'province_mismatch' };
    }
  }

  // 4. Set-based matching on points
  if (target.points.length > 0 && cand.points.length > 0) {
    const candSet = new Set(cand.points);
    const targetSet = new Set(target.points);

    let overlapCount = 0;
    for (const cp of candSet) {
      if (targetSet.has(cp)) {
        overlapCount++;
      } else {
        // Soft match if one contains another and length is reasonable (e.g. "bảo lộc" vs "1 bảo lộc")
        for (const tp of targetSet) {
          if (
            (tp.length > 4 && cp.includes(tp)) ||
            (cp.length > 4 && tp.includes(cp))
          ) {
            overlapCount++;
            break;
          }
        }
      }
    }

    const sizeT = targetSet.size;
    const sizeC = candSet.size;
    const unionSize = sizeT + sizeC - overlapCount;
    const jaccard = unionSize > 0 ? overlapCount / unionSize : 0;
    const containmentT = sizeT > 0 ? overlapCount / sizeT : 0;
    const containmentC = sizeC > 0 ? overlapCount / sizeC : 0;
    const maxContainment = Math.max(containmentT, containmentC);

    // Rule: At least 1 point matched, AND (maxContainment >= 0.5 OR overlapCount >= 3)
    if (overlapCount > 0 && (maxContainment >= 0.5 || overlapCount >= 3)) {
      // Score calculation:
      // Overlap count has highest priority (weight 1000), followed by Jaccard (weight 100)
      const score = overlapCount * 1000 + jaccard * 100;
      return {
        matched: true,
        score,
        overlapCount,
        jaccard,
        reason: 'cluster_set_match',
      };
    }
  }

  // 5. Fallback substring match
  if (
    target.normalizedFull.includes(cand.normalizedFull) ||
    cand.normalizedFull.includes(target.normalizedFull)
  ) {
    const score = 500 - Math.abs(target.normalizedFull.length - cand.normalizedFull.length);
    return {
      matched: true,
      score: Math.max(score, 10),
      overlapCount: 1,
      jaccard: 0.1,
      reason: 'substring_match',
    };
  }

  return { matched: false, score: 0, overlapCount: 0, jaccard: 0, reason: 'no_match' };
}

export interface CandidateWithRoute {
  route_name: string;
}

export interface MatchedCandidate<T extends CandidateWithRoute> {
  item: T;
  match: MatchResult;
}

/**
 * Filter and sort candidates by best route match.
 */
export function rankRouteMatches<T extends CandidateWithRoute>(
  targetRoute: string,
  candidates: T[]
): MatchedCandidate<T>[] {
  const matched: MatchedCandidate<T>[] = [];

  for (const item of candidates) {
    const match = matchRouteScore(targetRoute, item.route_name);
    if (match.matched) {
      matched.push({ item, match });
    }
  }

  matched.sort((a, b) => {
    // 1. Highest match score (higher overlap count, higher Jaccard)
    if (b.match.score !== a.match.score) {
      return b.match.score - a.match.score;
    }
    // 2. Tie breaker: closer length
    const targetLen = targetRoute.length;
    const diffA = Math.abs(a.item.route_name.length - targetLen);
    const diffB = Math.abs(b.item.route_name.length - targetLen);
    return diffA - diffB;
  });

  return matched;
}
