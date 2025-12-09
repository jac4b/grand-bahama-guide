const https = require('https');
const http = require('http');
const fs = require('fs');

// Extract all image URLs from the HTML file
const html = fs.readFileSync('/Users/jcacossa/Git/grand-bahama-guide/freeport-bahamas-guide.html', 'utf8');
const imageRegex = /\u003cimg src="(https?:\/\/[^"]+)"/g;

const imageUrls = [];
let match;
while ((match = imageRegex.exec(html)) !== null) {
    imageUrls.push(match[1]);
}

// Remove duplicates
const uniqueUrls = [...new Set(imageUrls)];

console.log(`\nChecking ${uniqueUrls.length} unique image URLs...\n`);

// Function to check if URL is accessible
function checkUrl(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const req = protocol.get(url, { timeout: 10000 }, (res) => {
            if (res.statusCode === 200) {
                resolve({ url, status: 'OK', code: res.statusCode });
            } else {
                resolve({ url, status: 'BROKEN', code: res.statusCode });
            }
            res.resume(); // Consume response data
        });

        req.on('error', (err) => {
            resolve({ url, status: 'ERROR', error: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ url, status: 'TIMEOUT' });
        });
    });
}

// Check all URLs
async function checkAllImages() {
    const results = [];
    
    for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i];
        console.log(`[${i + 1}/${uniqueUrls.length}] Checking: ${url.substring(0, 70)}...`);
        const result = await checkUrl(url);
        results.push(result);
        
        if (result.status !== 'OK') {
            console.log(`  ❌ ${result.status}${result.code ? ` (${result.code})` : ''}${result.error ? `: ${result.error}` : ''}`);
        } else {
            console.log(`  ✓ OK`);
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    
    const broken = results.filter(r => r.status !== 'OK');
    const working = results.filter(r => r.status === 'OK');
    
    console.log(`\nWorking images: ${working.length}/${results.length}`);
    console.log(`Broken images: ${broken.length}/${results.length}\n`);
    
    if (broken.length > 0) {
        console.log('BROKEN IMAGES:');
        console.log('-'.repeat(80));
        broken.forEach(img => {
            console.log(`\n${img.url}`);
            console.log(`  Status: ${img.status}${img.code ? ` (HTTP ${img.code})` : ''}${img.error ? ` - ${img.error}` : ''}`);
        });
    }
}

checkAllImages().catch(console.error);
