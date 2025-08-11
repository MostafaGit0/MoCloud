// netlify/functions/b2-auth.js
exports.handler = async (event, context) => {
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
  
    try {
      const { action, ...params } = JSON.parse(event.body);
  
      const B2_APPLICATION_KEY_ID = '0050a27238881a10000000001';
      const B2_APPLICATION_KEY = 'K0059KSIh9IHtNfHfdoug34H7MA8ArA';
      const B2_BUCKET_NAME = 'Mo_cloud';
  
      let response;
  
      switch (action) {
        case 'authorize':
          // B2 Account Authorization
          const credentials = Buffer.from(`${B2_APPLICATION_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
          
          response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${credentials}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`B2 Authorization failed: ${response.status}`);
          }
          
          const authData = await response.json();
          
          // Get bucket info
          const bucketResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_list_buckets`, {
            method: 'POST',
            headers: {
              'Authorization': authData.authorizationToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              accountId: B2_APPLICATION_KEY_ID
            })
          });
  
          if (!bucketResponse.ok) {
            throw new Error(`B2 Bucket list failed: ${bucketResponse.status}`);
          }
  
          const bucketData = await bucketResponse.json();
          const bucket = bucketData.buckets.find(b => b.bucketName === B2_BUCKET_NAME);
          
          if (!bucket) {
            throw new Error(`Bucket ${B2_BUCKET_NAME} not found`);
          }
  
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
  
        case 'getUploadUrl':
          // Get upload URL
          const { authToken, apiUrl, bucketId } = params;
          
          response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: 'POST',
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              bucketId: bucketId
            })
          });
  
          if (!response.ok) {
            throw new Error(`Get upload URL failed: ${response.status}`);
          }
  
          const uploadData = await response.json();
  
          return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(uploadData)
          };
  
        default:
          return {
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ error: 'Invalid action' })
          };
      }
  
    } catch (error) {
      console.error('B2 function error:', error);
      
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://mocloudapp.netlify.app',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: error.message || 'Internal server error' 
        })
      };
    }
  };