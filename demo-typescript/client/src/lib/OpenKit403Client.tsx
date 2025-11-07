async authenticate(options: AuthOptions): Promise<Response> {
  const method = options.method || 'GET';
  const headers = { ...options.headers };

  console.log('🔐 Starting authentication...');

  const response1 = await fetch(options.resource, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  console.log(`GET ${options.resource} ${response1.status}`);

  if (response1.status !== 403) {
    return response1;
  }

  console.log('✅ Got challenge header');

  const wwwAuth = response1.headers.get('WWW-Authenticate');
  if (!wwwAuth || !wwwAuth.startsWith('OpenKitx403')) {
    console.error('No OpenKitx403 challenge found');
    return response1;
  }

  const parsed = parseWWWAuthenticate(wwwAuth);
  if (!parsed) {
    console.error('Failed to parse challenge');
    return response1;
  }

  // Decode and log challenge details
  const challengeJson = base64urlDecode(parsed.challenge);
  const challenge: Challenge = JSON.parse(challengeJson);
  
  console.log('📋 Challenge details:', {
    method: challenge.method,
    path: challenge.path,
    aud: challenge.aud,
    alg: challenge.alg
  });

  if (!this.walletInstance) {
    await this.connect(options.wallet);
  }

  console.log('📝 Building signing string...');
  const signed = await this.signChallenge(parsed.challenge);
  console.log('✅ Signed');

  const nonce = generateNonce();
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  // Use challenge's method and path
  const bind = `${challenge.method}:${challenge.path}`;
  
  console.log('🔗 Bind parameter:', bind);

  const authHeader = `OpenKitx403 addr="${signed.address}", sig="${signed.signature}", challenge="${parsed.challenge}", ts="${ts}", nonce="${nonce}", bind="${bind}"`;

  console.log('🔄 Retrying with auth...');
  
  const response2 = await fetch(options.resource, {
    method,
    headers: {
      ...headers,
      'Authorization': authHeader
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  console.log(`GET ${options.resource} ${response2.status}`);

  if (response2.ok) {
    console.log('🎉 SUCCESS!');
  } else {
    const errorText = await response2.text();
    console.error('❌ Failed:', errorText);
  }

  return response2;
}

