export type BookingRequest = {
  clubId: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
};

export async function createBooking(_payload: BookingRequest) {
  void _payload;
  return { ok: true };
}
