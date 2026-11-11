export const getGoogleReviews = async () => {
  const placeId = process.env.PLACE_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=review&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();
  console.log(data);

  if (!data.result?.reviews) {
    throw new Error('No reviews found or invalid response');
  }

  return data.result.reviews;
};