import axios from 'axios';

async function testHomepageHeroAPI() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('Testing Home Page Management API flow...');

  try {
    // 1. Authenticate Admin
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@utctravel.com',
      password: 'password'
    });

    const token = loginRes.data?.accessToken;
    console.log('1. Admin logged in successfully.');
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Update Hero Content & Media Type to 'VIDEO'
    const heroPayload = {
      heroTitle: 'Ceylon Unlimited Luxury Expedition',
      heroSubtitle: 'Handpicked private villas, tea estate helicopter transfers and coastal retreats.',
      heroMediaType: 'VIDEO',
      heroVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      primaryCtaText: 'Reserve Experience',
      primaryCtaLink: '#date-selection',
      secondaryCtaText: 'Customise Travel Plan',
      secondaryCtaLink: '#date-selection'
    };

    const resPatch1 = await axios.patch(`${BASE_URL}/settings/homepage`, heroPayload, { headers });
    console.log('2. Updated Hero Content (VIDEO mode) status:', resPatch1.status);

    // 3. Create Hero Media item
    const resMedia = await axios.post(`${BASE_URL}/settings/homepage/hero-media`, {
      title: 'Ceylon Coastal Sunset',
      mediaType: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1600',
      displayOrder: 1,
      isActive: true
    }, { headers });
    console.log('3. Added Hero Media Slide ID:', resMedia.data?.data?.id);

    // 4. Verify Public GET endpoint
    const publicRes1 = await axios.get(`${BASE_URL}/settings/homepage`);
    console.log('4. Public GET Hero Title:', publicRes1.data?.data?.content?.heroTitle);
    console.log('   Public GET Hero Media Type:', publicRes1.data?.data?.content?.heroMediaType);

    // 5. Switch back to 'IMAGE' mode
    await axios.patch(`${BASE_URL}/settings/homepage`, { heroMediaType: 'IMAGE' }, { headers });
    const publicRes2 = await axios.get(`${BASE_URL}/settings/homepage`);
    console.log('5. Public GET Hero Media Type after switch:', publicRes2.data?.data?.content?.heroMediaType);

    if (
      publicRes1.data?.data?.content?.heroTitle === 'Ceylon Unlimited Luxury Expedition' &&
      publicRes2.data?.data?.content?.heroMediaType === 'IMAGE'
    ) {
      console.log('\n========================================');
      console.log('SUCCESS: Full Home Page Management API flow PASSED!');
      console.log('========================================\n');
    } else {
      console.error('FAIL: Verification mismatch');
    }
  } catch (err: any) {
    console.error('API Test Error:', err.message, err.response?.data);
  }
}

testHomepageHeroAPI();
