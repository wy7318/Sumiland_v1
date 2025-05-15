// sendgrid-test.mjs - ES Module compatible test script

// Import dependencies using ES module syntax
import * as dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';

// Load environment variables
dotenv.config();

// Set your SendGrid API key
const SENDGRID_API_KEY = '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';
if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY environment variable is not set');
    console.log('Create a .env file with SENDGRID_API_KEY=your_api_key');
    process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

// Configuration - Change these values
const YOUR_DOMAIN = 'simplidone.com';
const YOUR_VERIFIED_SENDER = 'support@simplidone.com'; // Your verified sender
const YOUR_EMAIL = 'mlee920117@gmail.com'; // Your email to receive test messages
const FORWARDING_ADDRESS = 'org53c12775_case@simplidone.com'; // Your forwarding address
const EDGE_FUNCTION_URL = 'https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/email-to-case';

// Test 1: Check API Key Validity
async function testApiKey() {
    console.log('\n----- Testing SendGrid API Key -----');
    try {
        // Use the SendGrid API to get user profile info
        const response = await axios.get('https://api.sendgrid.com/v3/user/profile', {
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`
            }
        });

        console.log('✅ API Key is valid!');
        console.log('User account:', response.data.username);
        return true;
    } catch (error) {
        console.error('❌ API Key test failed:', error.response?.status, error.response?.statusText);
        console.error('Make sure your SENDGRID_API_KEY is correct and has full access');
        return false;
    }
}

// Test 2: Check Domain Authentication
async function testDomainAuthentication() {
    console.log('\n----- Testing Domain Authentication -----');
    try {
        const response = await axios.get('https://api.sendgrid.com/v3/whitelabel/domains', {
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`
            }
        });

        // Check if the root domain is authenticated
        const domains = response.data;
        const rootDomain = domains.find(d => d.domain === YOUR_DOMAIN);

        if (rootDomain) {
            console.log('✅ Root domain is authenticated!');
            console.log('Domain status:', rootDomain.valid ? 'Valid' : 'Invalid');

            if (!rootDomain.valid) {
                console.log('⚠️ Domain is authenticated but not valid. Check DNS records.');
            }
        } else {
            console.log('❌ Root domain is NOT authenticated. You need to authenticate your root domain.');
            console.log('Only these domains are authenticated:');
            domains.forEach(d => console.log(`- ${d.domain} (${d.valid ? 'Valid' : 'Invalid'})`));
        }

        return rootDomain && rootDomain.valid;
    } catch (error) {
        console.error('❌ Domain authentication check failed:', error.response?.status, error.response?.statusText);
        return false;
    }
}

// Test 3: Check Inbound Parse Configuration
async function testInboundParse() {
    console.log('\n----- Testing Inbound Parse Configuration -----');
    try {
        const response = await axios.get('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`
            }
        });

        const inboundSettings = response.data;
        console.log('Found', inboundSettings.length, 'inbound parse settings');

        // Check if your domain is configured
        const domainConfig = inboundSettings.find(s => s.hostname === YOUR_DOMAIN);

        if (domainConfig) {
            console.log('✅ Inbound Parse is configured for your domain!');
            console.log('Hostname:', domainConfig.hostname);
            console.log('URL:', domainConfig.url);
            console.log('Spam Check:', domainConfig.spam_check);
            console.log('Send Raw:', domainConfig.send_raw);

            if (domainConfig.url !== EDGE_FUNCTION_URL) {
                console.log('⚠️ Warning: Webhook URL does not match your Edge Function URL');
            }

            if (!domainConfig.send_raw) {
                console.log('⚠️ Warning: "Send Raw" is not enabled. Enable "POST the raw, full MIME message"');
            }
        } else {
            console.log('❌ Inbound Parse is NOT configured for your root domain.');
            if (inboundSettings.length > 0) {
                console.log('Only these domains are configured:');
                inboundSettings.forEach(s => console.log(`- ${s.hostname} -> ${s.url}`));
            }
        }

        return domainConfig !== undefined;
    } catch (error) {
        console.error('❌ Inbound Parse check failed:', error.response?.status, error.response?.statusText);
        return false;
    }
}

// Test 4: Send Email to Test Outbound
async function testSendEmail() {
    console.log('\n----- Testing Outbound Email -----');

    // Create a timestamp for unique subject
    const timestamp = new Date().toISOString();

    // Create test message
    const msg = {
        to: YOUR_EMAIL,
        from: YOUR_VERIFIED_SENDER,
        subject: `SendGrid Test - ${timestamp}`,
        text: 'This is a test email to verify SendGrid is working correctly.',
        html: '<strong>This is a test email to verify SendGrid is working correctly.</strong>',
    };

    try {
        console.log(`Sending test email to ${YOUR_EMAIL}...`);
        await sgMail.send(msg);
        console.log('✅ Email sent successfully!');
        console.log('Check your inbox for the test email.');
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:', error.toString());
        if (error.response) {
            console.error(error.response.body);
        }
        return false;
    }
}

// Test 5: Test The Forwarding Address
async function testForwardingAddress() {
    console.log('\n----- Testing Forwarding Address Format -----');

    console.log(`Analyzing forwarding address: ${FORWARDING_ADDRESS}`);

    // Check for issues with the address format
    if (FORWARDING_ADDRESS.includes('_')) {
        console.log('⚠️ Warning: Underscore in email address can sometimes cause delivery issues');
        console.log('Suggestion: Try a forwarding address without underscores');
    }

    // Check for correct domain
    const addressDomain = FORWARDING_ADDRESS.split('@')[1];
    if (addressDomain !== YOUR_DOMAIN) {
        console.log('⚠️ Warning: Forwarding address domain does not match authenticated domain');
    }

    // Suggest a direct sending test
    console.log('\nTo test the forwarding address directly:');
    console.log(`1. Send an email to: ${FORWARDING_ADDRESS}`);
    console.log('2. Check for bounces and your Edge Function logs');
    console.log('3. If you get a bounce, please note the exact error message');

    return true;
}

// Test 6: Verify MX Records
async function testMXRecords() {
    console.log('\n----- Testing MX Records -----');

    try {
        // Use a public DNS API to query MX records
        const response = await axios.get(`https://dns.google/resolve?name=${YOUR_DOMAIN}&type=MX`);

        if (response.data.Answer) {
            const mxRecords = response.data.Answer.filter(record => record.type === 15); // MX record type

            if (mxRecords.length > 0) {
                console.log('✅ MX records found for your domain!');

                // Check if any MX record points to SendGrid
                const sendgridMX = mxRecords.find(record => record.data.includes('sendgrid.net'));

                if (sendgridMX) {
                    console.log('✅ SendGrid MX record found!');
                    console.log('MX Record:', sendgridMX.data);
                } else {
                    console.log('❌ No SendGrid MX record found. Add this MX record:');
                    console.log('Type: MX');
                    console.log('Host: @');
                    console.log('Value: mx.sendgrid.net');
                    console.log('Priority: 10');
                }

                console.log('\nAll MX records:');
                mxRecords.forEach(record => console.log(`- ${record.data}`));
            } else {
                console.log('❌ No MX records found for your domain');
            }
        } else {
            console.log('❌ Failed to retrieve MX records');
        }

        return true;
    } catch (error) {
        console.error('❌ MX record check failed:', error.toString());
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('=== SendGrid Email-to-Case Test Suite ===');
    console.log('Running tests to diagnose SendGrid configuration...');

    const apiKeyValid = await testApiKey();
    if (!apiKeyValid) {
        console.log('\n⛔ Cannot continue testing without a valid API key');
        return;
    }

    // Run domain tests even if some fail
    await testDomainAuthentication();
    await testInboundParse();
    await testMXRecords();
    await testForwardingAddress();

    // Only test sending if requested
    const shouldSendEmail = process.argv.includes('--send-test');
    if (shouldSendEmail) {
        await testSendEmail();
    } else {
        console.log('\nSkipping test email send. Use --send-test flag to send a test email.');
    }

    console.log('\n=== Test Summary and Recommendations ===');
    console.log('To fix your Email-to-Case setup:');
    console.log('1. Make sure your root domain (simplidone.com) is authenticated in SendGrid');
    console.log('2. Verify MX records point to mx.sendgrid.net');
    console.log('3. Ensure Inbound Parse is configured for simplidone.com and points to your Edge Function');
    console.log('4. Try simplifying the forwarding address by removing underscores');
    console.log('\nAfter making changes, run this test again to verify.');
}

// Start the tests
runTests().catch(console.error);













