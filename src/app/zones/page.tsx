// Redirect /zones → /geofencing so old bookmarked links don't 404
import { redirect } from 'next/navigation';

export default function ZonesRedirect() {
  redirect('/geofencing');
}
