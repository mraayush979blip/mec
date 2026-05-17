async function testDevpost() {
  try {
    const response = await fetch('https://devpost.com/api/hackathons?challenge_type[]=online&challenge_type[]=in-person&status[]=submission-open', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    console.log('Status Code:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Total Hackathons fetched:', data.hackathons ? data.hackathons.length : 0);
      if (data.hackathons && data.hackathons.length > 0) {
        console.log('Sample Hackathon:', JSON.stringify(data.hackathons[0], null, 2));
      }
    } else {
      const text = await response.text();
      console.log('Error Response:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

testDevpost();
