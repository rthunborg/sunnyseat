import type {
  ReviewDto,
  ReviewPhotoAttachmentDto,
  ReviewSummaryDto,
  VenueDataDto,
} from '@/lib/types/api';
import { VENUE_FIXTURE } from '@/lib/services/venues-fixture';

type ReviewInsertRow = {
  venue_id: string;
  venue_slug: string;
  text: string;
  rating?: number;
  photo_name?: string;
  photo_type?: string;
  photo_size?: number;
  photo_last_modified?: number;
};

type ReviewInsertResult = {
  id?: string | null;
  created_at?: string | null;
};

type ReviewSelectRow = Omit<
  ReviewInsertRow,
  'rating' | 'photo_name' | 'photo_type' | 'photo_size' | 'photo_last_modified'
> & {
  id?: string | null;
  rating?: number | null;
  photo_name?: string | null;
  photo_type?: string | null;
  photo_size?: number | null;
  photo_last_modified?: number | null;
  created_at?: string | null;
};

type FixtureReviewSeed = Omit<ReviewDto, 'venueId' | 'venueSlug'>;

const fixtureReviewSeeds: Record<string, FixtureReviewSeed[]> = {
  '1': [
    {
      id: 'review_fixture_1_new',
      text: 'Kvällssolen låg kvar över innergården och borden längst ut var klart bäst.',
      rating: 5,
      createdAt: '2026-06-07T15:30:00.000Z',
    },
    {
      id: 'review_fixture_1_old',
      text: 'Bra plats för eftermiddagskaffe. Lite skugga nära väggen men gott om sol i mitten.',
      rating: 4,
      createdAt: '2026-06-06T13:10:00.000Z',
    },
  ],
  '2': [
    {
      id: 'review_fixture_2_new',
      text: 'Soligt på taksidan efter lunch och enkelt att hitta bord.',
      rating: 5,
      createdAt: '2026-06-06T14:20:00.000Z',
    },
    {
      id: 'review_fixture_2_old',
      text: 'Fin uteservering men lite blåsigt när vi var där.',
      rating: 4,
      createdAt: '2026-06-04T16:45:00.000Z',
    },
  ],
  '3': [
    {
      id: 'review_fixture_3_new',
      text: 'Trevligt läge vid Magasinsgatan och bäst sol efter två.',
      rating: 5,
      createdAt: '2026-06-05T13:55:00.000Z',
    },
  ],
  '4': [
    {
      id: 'review_fixture_4_new',
      text: 'Ytterborden fick mest sol. Bra när man vill sitta lite lugnare.',
      rating: 4,
      createdAt: '2026-06-05T11:35:00.000Z',
    },
  ],
  '5': [
    {
      id: 'review_fixture_5_new',
      text: 'Kortare solfönster än väntat, men gården är väldigt behaglig.',
      rating: 4,
      createdAt: '2026-06-03T17:05:00.000Z',
    },
  ],
  '6': [
    {
      id: 'review_fixture_6_new',
      text: 'Mer skugga än sol, men bra val när det är riktigt varmt.',
      rating: 4,
      createdAt: '2026-06-02T12:00:00.000Z',
    },
  ],
  '7': [
    {
      id: 'review_fixture_7_new',
      text: 'Mysig bakgård. Solen kommer snabbt och försvinner snabbt.',
      rating: 5,
      createdAt: '2026-06-01T12:30:00.000Z',
    },
  ],
};

const memoryReviews: ReviewDto[] = [];

export function resolveReviewVenueIdentifier(identifier: string): VenueDataDto | null {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) return null;
  return VENUE_FIXTURE.find((candidate) =>
    candidate.id === normalizedIdentifier ||
    candidate.venueId === normalizedIdentifier ||
    candidate.slug === normalizedIdentifier ||
    candidate.venueSlug === normalizedIdentifier
  ) ?? null;
}

export function getVenueReviews(venue: VenueDataDto): ReviewDto[] {
  return sortReviewsNewestFirst([
    ...seededReviewsForVenue(venue),
    ...memoryReviews.filter((review) => review.venueId === venue.id),
  ]);
}

export async function getVenueReviewsFromPersistence(venue: VenueDataDto): Promise<ReviewDto[]> {
  if (!usesSupabaseReviewPersistence()) return getVenueReviews(venue);
  if (!hasSupabaseServiceRoleConfig()) {
    throw new Error('Review persistence is configured for Supabase but credentials are incomplete');
  }
  return sortReviewsNewestFirst(await readSupabaseReviewsForVenue(venue));
}

export function getReviewSummaryForVenue(venue: VenueDataDto): ReviewSummaryDto {
  return summarizeReviews(getVenueReviews(venue));
}

export async function getReviewSummaryForVenueFromPersistence(
  venue: VenueDataDto,
): Promise<ReviewSummaryDto> {
  return summarizeReviews(await getVenueReviewsFromPersistence(venue));
}

export function getReviewSummaryForVenueIdentifier(identifier: string): ReviewSummaryDto | null {
  const venue = resolveReviewVenueIdentifier(identifier);
  return venue ? getReviewSummaryForVenue(venue) : null;
}

export async function persistVenueReview(review: ReviewDto): Promise<ReviewDto> {
  if (!usesSupabaseReviewPersistence()) {
    memoryReviews.push(review);
    return review;
  }

  if (!hasSupabaseServiceRoleConfig()) {
    throw new Error('Review persistence is configured for Supabase but credentials are incomplete');
  }

  const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
  const { data, error } = await getSupabaseServiceRole()
    .from('reviews')
    .insert(toReviewInsertRow(review))
    .select('id, created_at')
    .single();

  if (error) {
    throw new Error(`Review persistence failed: ${error.message}`);
  }

  const row = data as ReviewInsertResult | null;
  return {
    ...review,
    id: row?.id ?? review.id,
    createdAt: row?.created_at ?? review.createdAt,
  };
}

export function clearPersistedVenueReviewsForTests() {
  memoryReviews.length = 0;
}

export function getPersistedVenueReviewsForTests(): ReviewDto[] {
  return [...memoryReviews];
}

function seededReviewsForVenue(venue: VenueDataDto): ReviewDto[] {
  return (fixtureReviewSeeds[venue.id] ?? []).map((review) => ({
    ...review,
    venueId: venue.id,
    venueSlug: venue.slug,
  }));
}

function sortReviewsNewestFirst(reviews: ReviewDto[]): ReviewDto[] {
  return [...reviews].sort((a, b) => {
    const createdAtDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (createdAtDiff !== 0) return createdAtDiff;
    return b.id.localeCompare(a.id);
  });
}

export function summarizeReviews(reviews: ReviewDto[]): ReviewSummaryDto {
  const ratedReviews = reviews.filter((review): review is ReviewDto & { rating: number } =>
    Number.isInteger(review.rating),
  );
  if (ratedReviews.length === 0) {
    return {
      averageRating: null,
      reviewCount: reviews.length,
    };
  }
  const total = ratedReviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    averageRating: Math.round((total / ratedReviews.length) * 10) / 10,
    reviewCount: reviews.length,
  };
}

function usesSupabaseReviewPersistence(): boolean {
  return process.env.SUNNYSEAT_REVIEW_PERSISTENCE === 'supabase';
}

function hasSupabaseServiceRoleConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function readSupabaseReviewsForVenue(venue: VenueDataDto): Promise<ReviewDto[]> {
  const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
  const { data, error } = await getSupabaseServiceRole()
    .from('reviews')
    .select('id, venue_id, venue_slug, text, rating, photo_name, photo_type, photo_size, photo_last_modified, created_at')
    .or(
      `venue_id.eq.${orFilterValue(venue.id)},venue_slug.eq.${orFilterValue(venue.slug)}`,
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Review persistence failed: ${error.message}`);
  }

  return ((data ?? []) as ReviewSelectRow[]).map((row) => fromReviewSelectRow(row, venue));
}

/**
 * Quote + escape a value for a PostgREST `.or()` operand. Once the live venue
 * store supplies arbitrary slugs, a reserved token (`,` `.` `(` `)` `:`) raw-
 * interpolated into the filter could corrupt it or match unintended rows.
 * PostgREST treats a double-quoted operand as a literal; inner `"` and `\` are
 * backslash-escaped. For plain values (`"1"`, `"test-venue-sunny"`) the quotes
 * are semantically transparent for a text column. [Story 8.5 6.3 / AC#4d]
 */
function orFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function toReviewInsertRow(review: ReviewDto): ReviewInsertRow {
  return {
    venue_id: review.venueId,
    venue_slug: review.venueSlug,
    text: review.text,
    ...(review.rating !== undefined ? { rating: review.rating } : {}),
    ...photoColumns(review.photo),
  };
}

function fromReviewSelectRow(row: ReviewSelectRow, venue: VenueDataDto): ReviewDto {
  return {
    id: row.id ?? `review_${venue.id}_${row.created_at ?? 'unknown'}`,
    venueId: row.venue_id,
    venueSlug: row.venue_slug,
    text: row.text,
    ...(typeof row.rating === 'number' && Number.isInteger(row.rating)
      ? { rating: row.rating }
      : {}),
    ...photoFromColumns(row),
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

function photoColumns(
  photo: ReviewPhotoAttachmentDto | undefined,
): Pick<
  ReviewInsertRow,
  'photo_name' | 'photo_type' | 'photo_size' | 'photo_last_modified'
> {
  if (!photo) return {};
  return {
    photo_name: photo.name,
    photo_type: photo.type,
    photo_size: photo.size,
    ...(photo.lastModified !== undefined
      ? { photo_last_modified: photo.lastModified }
      : {}),
  };
}

function photoFromColumns(row: ReviewSelectRow): { photo?: ReviewPhotoAttachmentDto } {
  if (!row.photo_name || !row.photo_type || row.photo_size == null) return {};
  return {
    photo: {
      name: row.photo_name,
      type: row.photo_type,
      size: row.photo_size,
      ...(row.photo_last_modified != null
        ? { lastModified: row.photo_last_modified }
        : {}),
    },
  };
}
