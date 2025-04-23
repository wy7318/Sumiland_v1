import React from 'react';

export function TermsOfServicePage() {
    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="bg-white shadow-md rounded-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                        <p className="text-gray-700 mb-4">
                            Welcome to SimpliDone. These Terms of Service ("Terms") govern your
                            access to and use of the SimpliDone platform, website, and services
                            (collectively, the "Services"). Please read these Terms carefully
                            before using our Services.
                        </p>
                        <p className="text-gray-700 mb-4">
                            By accessing or using the Services, you agree to be bound by these Terms
                            and our Privacy Policy. If you do not agree to these Terms, you may not
                            access or use the Services.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Definitions</h2>
                        <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                            <li><strong>"Account"</strong> means your registered account with SimpliDone.</li>
                            <li><strong>"Content"</strong> means any data, information, or material that is
                                uploaded, stored, or otherwise processed through the Services.</li>
                            <li><strong>"Subscription"</strong> means the paid access to the Services based on
                                the plan you select.</li>
                            <li><strong>"User"</strong> means any individual who accesses or uses the Services,
                                including you.</li>
                            <li><strong>"SimpliDone," "we," "us,"</strong> or <strong>"our"</strong> refers to
                                SimpliDone and its affiliates.</li>
                            <li><strong>"You"</strong> or <strong>"your"</strong> refers to the individual or entity using
                                the Services.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration and Eligibility</h2>

                        <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">3.1 Account Creation</h3>
                        <p className="text-gray-700 mb-4">
                            To use the Services, you must create an Account. You agree to provide
                            accurate, current, and complete information during the registration
                            process and to update such information to keep it accurate, current, and
                            complete.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">3.2 Account Security</h3>
                        <p className="text-gray-700 mb-4">
                            You are responsible for maintaining the confidentiality of your Account
                            credentials and for all activities that occur under your Account. All
                            credentials are securely stored in our Supabase backend with enhanced
                            row-level security (RLS) protocols that ensure only authorized users can
                            access specific data. You agree to notify us immediately of any
                            unauthorized use of your Account or any other breach of security.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">3.3 Eligibility</h3>
                        <p className="text-gray-700 mb-4">
                            You represent and warrant that you are at least 18 years old and have
                            the legal capacity to enter into these Terms. If you are accessing or
                            using the Services on behalf of an entity, you represent and warrant
                            that you have the authority to bind that entity to these Terms.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription and Payment</h2>

                        <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.1 Subscription Plans</h3>
                        <p className="text-gray-700 mb-4">
                            SimpliDone offers various Subscription plans with different features and
                            pricing. The features and limitations of each plan are described on our
                            website.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.2 Payment Terms</h3>
                        <p className="text-gray-700 mb-4">
                            You agree to pay all fees associated with your Subscription plan. All
                            payments are non-refundable except as expressly provided in these Terms.
                            Fees are exclusive of taxes, which you are responsible for paying.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.3 Billing Cycle</h3>
                        <p className="text-gray-700 mb-4">
                            Your Subscription will automatically renew at the end of each billing
                            cycle unless you cancel it at least 30 days before the end of the
                            current billing period. You authorize us to charge your payment method
                            on file for the Subscription fees at the beginning of each billing
                            cycle.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.4 Price Changes</h3>
                        <p className="text-gray-700 mb-4">
                            We may change the fees for the Services at any time, but we will provide
                            you with advance notice before any price change takes effect. If you do
                            not agree to the price change, you may cancel your Subscription before
                            the price change takes effect.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.5 Cancellation</h3>
                        <p className="text-gray-700 mb-4">
                            You may cancel your Subscription at any time by providing notice at
                            least 30 days before the end of your current billing period. To cancel,
                            log into your account settings or contact our support team. Upon
                            cancellation, your Subscription will remain active until the end of the
                            current billing period, after which it will terminate. No refunds or
                            credits will be provided for partial billing periods.
                        </p>
                    </section>

                    {/* Continue with other sections following the same pattern */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Use of the Services</h2>
                        {/* Content for this section */}
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Content</h2>
                        {/* Content for this section */}
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
                        {/* Content for this section */}
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Term and Termination</h2>
                        {/* Content for this section */}
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimer of Warranties</h2>
                        <p className="text-gray-700 mb-4 uppercase">
                            THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT
                            WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT
                            PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED
                            TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                            PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                        <p className="text-gray-700 mb-4 uppercase">
                            WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE,
                            OR SECURE, OR THAT ANY DEFECTS WILL BE CORRECTED. WE DO NOT WARRANT THAT
                            THE SERVICES WILL MEET YOUR REQUIREMENTS OR THAT ANY CONTENT WILL BE
                            ACCURATE OR RELIABLE.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
                        <p className="text-gray-700 mb-4 uppercase">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL SIMPLIDONE OR
                            ITS AFFILIATES, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT,
                            SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT
                            NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF
                            OR IN CONNECTION WITH THESE TERMS OR THE USE OR INABILITY TO USE THE
                            SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH
                            DAMAGES.
                        </p>
                        <p className="text-gray-700 mb-4 uppercase">
                            OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE
                            TERMS OR THE SERVICES WILL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE
                            SERVICES DURING THE 12 MONTHS PRECEDING THE CLAIM.
                        </p>
                        <p className="text-gray-700 mb-4 uppercase">
                            THE LIMITATIONS IN THIS SECTION WILL APPLY EVEN IF ANY LIMITED REMEDY
                            FAILS OF ITS ESSENTIAL PURPOSE.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Indemnification</h2>
                        {/* Content for this section */}
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">12. General Provisions</h2>
                        {/* Content for this section */}
                    </section>

                    <div className="text-gray-600 text-sm mt-8 border-t pt-6">
                        Last Updated: April 1st 2025
                    </div>
                </div>
            </div>
        </div>
    );
}