// netlify/functions/b2-auth.js

exports.handler = async (event, context) => {
    console.log('Function called with method:', event.httpMethod);
    console.log('Function body:', event.body);
  
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      };
    }
  
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  
    try {
      console.log('Parsing request body...');
      const { action, ...params } = JSON.parse(event.body || '{}');
      console.log('Action:', action);
  
      const B2_APPLICATION_KEY_ID = '0050a27238881a10000000001';
      const B2_APPLICATION_KEY = 'K0059KSIh9IHtNfHfdoug34H7MA8ArA';
      const B2_BUCKET_NAME = 'Mo_cloud';
  
      if (action === 'authorize') {
        console.log('Starting B2 authorization...');
        
        // Create credentials - fix the encoding
        const authString = `${B2_APPLICATION_KEY_ID}:${B2_APPLICATION_KEY}`;
        const credentials = Buffer.from(authString).toString('base64');
        console.log('Credentials created for:', B2_APPLICATION_KEY_ID);
        
        // B2 Account Authorization - use global fetch
        console.log('Calling B2 API...');
        
        const authResponse = await globalThis.fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`
          }
        });
        
        console.log('B2 API response status:', authResponse.status);
        
        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          console.error('B2 API error response:', errorText);
          throw new Error(`B2 Authorization failed: ${authResponse.status} - ${errorText}`);
        }
        
        const authData = await authResponse.json();
        console.log('B2 auth successful, API URL:', authData.apiUrl);
        
        // Get bucket info
        console.log('Getting bucket list...');
        const bucketResponse = await globalThis.fetch(`${authData.apiUrl}/b2api/v2/b2_list_buckets`, {
          method: 'POST',
          headers: {
            'Authorization': authData.authorizationToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            accountId: B2_APPLICATION_KEY_ID
          })
        });
  
        console.log('Bucket API response status:', bucketResponse.status);
  
        if (!bucketResponse.ok) {
          const errorText = await bucketResponse.text();
          console.error('Bucket API error response:', errorText);
          throw new Error(`B2 Bucket list failed: ${bucketResponse.status} - ${errorText}`);
        }
  
        const bucketData = await bucketResponse.json();
        console.log('Available buckets:', bucketData.buckets?.map(b => b.bucketName));
        
        const bucket = bucketData.buckets?.find(b => b.bucketName === B2_BUCKET_NAME);
        
        if (!bucket) {
          console.error('Bucket not found. Available buckets:', bucketData.buckets?.map(b => b.bucketName));
          throw new Error(`Bucket ${B2_BUCKET_NAME} not found. Available: ${bucketData.buckets?.map(b => b.bucketName).join(', ')}`);
        }
  
        console.log('Success! Found bucket:', bucket.bucketName, 'ID:', bucket.bucketId);
  
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            authorizationToken: authData.authorizationToken,
            apiUrl: authData.apiUrl,
            downloadUrl: authData.downloadUrl,
            bucketId: bucket.bucketId
          })
        };
  
      } else if (action === 'getUploadUrl') {
        console.log('Getting upload URL...');
        const { authToken, apiUrl, bucketId } = params;
        
        const uploadResponse = await globalThis.fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
          method: 'POST',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bucketId: bucketId
          })
        });
  
        console.log('Upload URL response status:', uploadResponse.status);
  
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload URL error response:', errorText);
          throw new Error(`Get upload URL failed: ${uploadResponse.status} - ${errorText}`);
        }
  
        const uploadData = await uploadResponse.json();
        console.log('Upload URL retrieved successfully');
  
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(uploadData)
        };
  
      } else {
        console.log('Invalid action:', action);
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({ error: `Invalid action: ${action}` })
        };
      }
  
    } catch (error) {
      console.error('Function error:', error.message);
      console.error('Error stack:', error.stack);
      
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: error.message || 'Internal server error',
          stack: error.stack
        })
      };
    }
  };