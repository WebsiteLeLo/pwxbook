async function testApi() {
  const bookId = '6960d61b40ef2a0870364bf7';
  const chapterId = '6960d8346a84f5feee3a43ae';
  const page = 1;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://study.pw.live/',
    'client-id': 'test-client-123'
  };

  try {
    const reqRes = await fetch(`https://pwsecure.gourav23032009.workers.dev/api/pw/engagement/ai-ncert/v1/chapters/requestId/${bookId}/${chapterId}/${page}`, { headers });
    const reqData = await reqRes.json();
    console.log('RequestId Data:', reqData);

    const reqId = reqData.data.requestId;

    const secureRes = await fetch(`https://pwsecure.gourav23032009.workers.dev/api/pw/engagement/ai-ncert/v1/chapters/secure-details/v2/${bookId}/${chapterId}/${page}`, {
      headers: {
        ...headers,
        'requestId': reqId,
      }
    });
    const secureData = await secureRes.json();
    console.log('Secure Details Data:', JSON.stringify(secureData, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

testApi();
