// import { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { ChevronRight, ChevronDown, Plus, Sparkles, TrendingUp, Brain, Zap, Mail, Globe } from 'lucide-react';

// export function FeaturesHubSection() {
//     const [activeTab, setActiveTab] = useState(0);
//     const [expandedFeature, setExpandedFeature] = useState(null);

//     // Cloud-based features data
//     const cloudFeatures = [
//         // Simply-Sales
//         [
//             {
//                 id: 'lead-management',
//                 icon: '🎯',
//                 title: 'AI-Powered Lead Management',
//                 shortDesc: 'Intelligent lead scoring with automated nurturing workflows',
//                 description: 'Advanced lead capture, scoring, and nurturing with AI-driven insights and automated follow-up sequences',
//                 benefits: 'Transform prospects into customers 40% faster with our intelligent lead scoring system. AI analyzes behavior patterns, engagement levels, and demographic data to prioritize your hottest leads. Automated nurturing sequences ensure no lead falls through the cracks, while predictive analytics help forecast conversion probability.',
//                 tags: ['AI-Powered', 'Automation', 'Analytics']
//             },
//             {
//                 id: 'account-management',
//                 icon: '🏢',
//                 title: 'Unified Account Management',
//                 shortDesc: '360-degree account visibility with relationship mapping',
//                 description: 'Comprehensive account tracking with relationship mapping, contact hierarchies, and engagement history',
//                 benefits: 'Get complete visibility into your most valuable accounts with detailed relationship maps, interaction timelines, and business hierarchy tracking. Our AI identifies expansion opportunities, tracks decision-maker influence, and predicts account health to help you grow revenue within existing accounts by an average of 35%.',
//                 tags: ['360-View', 'Relationship Mapping', 'Growth Tracking']
//             },
//             {
//                 id: 'opportunity-pipeline',
//                 icon: '📈',
//                 title: 'Smart Opportunity Pipeline',
//                 shortDesc: 'Predictive forecasting with automated stage progression',
//                 description: 'Intelligent pipeline management with AI-powered forecasting, deal probability scoring, and automated workflows',
//                 benefits: 'Increase forecast accuracy by 60% with AI-driven deal scoring and predictive analytics. Track opportunities through customizable sales stages with automated task creation, reminder systems, and probability assessments. Real-time pipeline insights help sales managers make data-driven decisions and optimize team performance.',
//                 tags: ['Forecasting', 'AI Scoring', 'Pipeline Management']
//             },
//             {
//                 id: 'quote-order-management',
//                 icon: '📋',
//                 title: 'Automated Quote & Order System',
//                 shortDesc: 'Dynamic pricing with approval workflows and order tracking',
//                 description: 'Streamlined quote generation, approval workflows, and order management with integrated pricing intelligence',
//                 benefits: 'Reduce quote generation time by 70% with automated templates, dynamic pricing rules, and built-in approval workflows. Track orders from creation to fulfillment with real-time status updates. Integration with inventory systems ensures accurate pricing and availability, while customizable templates maintain brand consistency.',
//                 tags: ['Automation', 'Dynamic Pricing', 'Workflow Management']
//             },
//             {
//                 id: 'sales-analytics',
//                 icon: '📊',
//                 title: 'Advanced Sales Analytics',
//                 shortDesc: 'Insightful reporting with predictive forecasting capabilities',
//                 description: 'Comprehensive sales analytics with customizable dashboards, performance metrics, and forecasting tools',
//                 benefits: 'Make informed decisions with real-time sales performance insights, team productivity metrics, and market trend analysis. Our advanced forecasting algorithms help predict revenue with 85% accuracy, while customizable dashboards provide at-a-glance visibility into KPIs that matter most to your business.',
//                 tags: ['Custom Reports', 'Forecasting', 'Performance Metrics']
//             },
//             {
//                 id: 'email-integration-sales',
//                 icon: '✉️',
//                 title: 'Seamless Email Integration',
//                 shortDesc: 'Gmail/Outlook sync with engagement tracking and automation',
//                 description: 'Native integration with Gmail and Outlook featuring engagement tracking, automated sequences, and CRM sync',
//                 benefits: 'Never miss important communications with automatic email logging, engagement tracking, and follow-up reminders. Track open rates, click-through rates, and response times to optimize your outreach strategy. Automated email sequences nurture leads while you focus on closing deals.',
//                 tags: ['Gmail/Outlook', 'Engagement Tracking', 'Auto-Sequences']
//             }
//         ],
//         // Simply-Service
//         [
//             {
//                 id: 'case-management',
//                 icon: '🎫',
//                 title: 'Intelligent Case Management',
//                 shortDesc: 'AI-powered routing with SLA tracking and escalation',
//                 description: 'Advanced case routing, priority management, and SLA tracking with automated escalation workflows',
//                 benefits: 'Resolve customer issues 50% faster with intelligent case routing that automatically assigns tickets to the right agents based on expertise, workload, and priority. SLA tracking ensures compliance while escalation workflows prevent issues from falling through cracks. AI suggests solutions based on historical case data.',
//                 tags: ['AI Routing', 'SLA Tracking', 'Auto-Escalation']
//             },
//             {
//                 id: 'multichannel-support',
//                 icon: '🎧',
//                 title: 'Omnichannel Customer Support',
//                 shortDesc: 'Unified support across email, chat, phone, and social media',
//                 description: 'Centralized support hub managing all customer communications across multiple channels with unified agent workspace',
//                 benefits: 'Provide consistent, personalized support across all channels with complete conversation history and context. Agents can seamlessly switch between email, chat, phone, and social media without losing context. Knowledge base integration provides instant access to solutions, reducing resolution time by 45%.',
//                 tags: ['Omnichannel', 'Unified Workspace', 'Knowledge Base']
//             },
//             {
//                 id: 'email-to-case',
//                 icon: '📧',
//                 title: 'Smart Email-to-Case',
//                 shortDesc: 'Automated case creation from emails with intelligent categorization',
//                 description: 'Automatic case creation from incoming emails with AI-powered categorization, priority assignment, and routing',
//                 benefits: 'Transform every customer email into a trackable case automatically. AI analyzes email content to determine priority, category, and appropriate agent assignment. Thread management keeps related communications organized, while duplicate detection prevents case proliferation. Reduce manual case creation by 90%.',
//                 tags: ['Auto-Creation', 'AI Categorization', 'Thread Management']
//             },
//             {
//                 id: 'web-to-case',
//                 icon: '🌐',
//                 title: 'Advanced Web-to-Case',
//                 shortDesc: 'Customizable web forms with intelligent pre-population',
//                 description: 'Flexible web forms with conditional logic, file attachments, and automatic case creation with customer matching',
//                 benefits: 'Capture customer issues directly from your website with customizable forms that adapt based on issue type. Automatic customer matching links cases to existing records, while intelligent pre-population speeds up form completion. Real-time form analytics help optimize conversion rates.',
//                 tags: ['Custom Forms', 'Auto-Matching', 'Conditional Logic']
//             },
//             {
//                 id: 'service-analytics',
//                 icon: '📈',
//                 title: 'Service Performance Analytics',
//                 shortDesc: 'Customer satisfaction tracking with predictive insights',
//                 description: 'Comprehensive service metrics including response times, resolution rates, and customer satisfaction with predictive analytics',
//                 benefits: 'Monitor service quality with real-time dashboards tracking first-call resolution, average response time, and customer satisfaction scores. Predictive analytics identify potential service issues before they impact customers. Team performance metrics help optimize agent productivity and training needs.',
//                 tags: ['CSAT Tracking', 'Predictive Analytics', 'Team Performance']
//             },
//             {
//                 id: 'communication-hub',
//                 icon: '💬',
//                 title: 'Unified Communication Hub',
//                 shortDesc: 'Integrated messaging with conversation continuity',
//                 description: 'Centralized communication platform with conversation threading, automated responses, and escalation management',
//                 benefits: 'Maintain conversation continuity across all touchpoints with complete interaction history. Automated acknowledgments reassure customers while intelligent routing ensures expertise matching. Internal collaboration tools enable team consultation without customer visibility, improving first-contact resolution by 60%.',
//                 tags: ['Conversation Threading', 'Auto-Responses', 'Team Collaboration']
//             }
//         ],
//         // Simply-Inventory
//         [
//             {
//                 id: 'inventory-tracking',
//                 icon: '📦',
//                 title: 'Real-Time Inventory Tracking',
//                 shortDesc: 'Live stock monitoring with automated reordering and alerts',
//                 description: 'Advanced inventory management with real-time stock levels, automated reorder points, and low-stock alerts',
//                 benefits: 'Eliminate stockouts and overstock situations with real-time inventory visibility across multiple locations. AI-powered demand forecasting automatically adjusts reorder points based on seasonal trends, supplier lead times, and sales patterns. Reduce carrying costs by 25% while improving product availability.',
//                 tags: ['Real-Time Tracking', 'Auto-Reordering', 'Multi-Location']
//             },
//             {
//                 id: 'purchase-management',
//                 icon: '🛒',
//                 title: 'Intelligent Purchase Management',
//                 shortDesc: 'Vendor optimization with smart ordering and cost analysis',
//                 description: 'Comprehensive purchase order management with vendor performance tracking, cost optimization, and approval workflows',
//                 benefits: 'Optimize purchasing decisions with vendor performance analytics, cost trend analysis, and automated approval workflows. Smart ordering suggestions based on historical data, current inventory levels, and demand forecasting help reduce costs by 20% while ensuring optimal stock levels.',
//                 tags: ['Vendor Analytics', 'Cost Optimization', 'Smart Ordering']
//             },
//             {
//                 id: 'product-catalog',
//                 icon: '🏷️',
//                 title: 'Dynamic Product Management',
//                 shortDesc: 'Intelligent catalog management with pricing optimization',
//                 description: 'Advanced product catalog with dynamic pricing, variant management, and automated updates across channels',
//                 benefits: 'Manage complex product catalogs with ease using AI-powered categorization, automated attribute mapping, and dynamic pricing rules. Sync product information across all sales channels instantly while tracking performance metrics to optimize pricing and positioning strategies.',
//                 tags: ['Dynamic Pricing', 'Channel Sync', 'AI Categorization']
//             },
//             {
//                 id: 'warehouse-optimization',
//                 icon: '🏭',
//                 title: 'Smart Warehouse Management',
//                 shortDesc: 'Location optimization with pick path efficiency and cycle counting',
//                 description: 'Intelligent warehouse operations with location tracking, pick path optimization, and automated cycle counting',
//                 benefits: 'Increase warehouse efficiency by 40% with optimized pick paths, intelligent slotting recommendations, and automated inventory auditing. Real-time location tracking and barcode scanning integration ensure accuracy while reducing fulfillment time and labor costs.',
//                 tags: ['Pick Optimization', 'Location Tracking', 'Cycle Counting']
//             },
//             {
//                 id: 'inventory-analytics',
//                 icon: '📊',
//                 title: 'Predictive Inventory Analytics',
//                 shortDesc: 'Demand forecasting with profitability analysis and trend identification',
//                 description: 'Advanced analytics for inventory turnover, demand forecasting, profitability analysis, and seasonal trend identification',
//                 benefits: 'Make data-driven inventory decisions with comprehensive analytics covering turnover rates, carrying costs, and profit margins. Predictive models forecast demand patterns with 90% accuracy, helping optimize stock levels and identify slow-moving inventory before it impacts cash flow.',
//                 tags: ['Demand Forecasting', 'Profitability Analysis', 'Trend Identification']
//             },
//             {
//                 id: 'supply-chain-integration',
//                 icon: '🔗',
//                 title: 'Supply Chain Automation',
//                 shortDesc: 'Vendor communication with automated workflows and performance tracking',
//                 description: 'Integrated supply chain management with automated vendor communication, performance monitoring, and exception handling',
//                 benefits: 'Streamline supplier relationships with automated purchase orders, delivery confirmations, and performance scorecards. Exception handling workflows alert you to potential disruptions while automated communication keeps vendors informed of requirements and changes.',
//                 tags: ['Vendor Communication', 'Performance Monitoring', 'Exception Handling']
//             }
//         ],
//         // Simply-Restaurant
//         [
//             {
//                 id: 'customer-loyalty',
//                 icon: '👥',
//                 title: 'Smart Customer Management',
//                 shortDesc: 'Loyalty programs with preference tracking and personalized experiences',
//                 description: 'Advanced customer profiling with loyalty programs, dietary preferences, and personalized marketing automation',
//                 benefits: 'Build lasting customer relationships with comprehensive preference tracking, automated loyalty rewards, and personalized dining experiences. AI analyzes ordering patterns to suggest menu items and promotions, increasing average order value by 30% while improving customer satisfaction.',
//                 tags: ['Loyalty Programs', 'Preference Tracking', 'Personalization']
//             },
//             {
//                 id: 'online-ordering',
//                 icon: '📱',
//                 title: 'Integrated Online Ordering',
//                 shortDesc: 'Multi-platform ordering with real-time tracking and delivery management',
//                 description: 'Comprehensive online ordering system with mobile apps, delivery tracking, and integrated payment processing',
//                 benefits: 'Maximize revenue with seamless online ordering across web, mobile, and third-party platforms. Real-time order tracking, automated notifications, and integrated delivery management create exceptional customer experiences while reducing operational overhead by 35%.',
//                 tags: ['Multi-Platform', 'Real-Time Tracking', 'Payment Integration']
//             },
//             {
//                 id: 'menu-inventory',
//                 icon: '📋',
//                 title: 'Dynamic Menu & Inventory',
//                 shortDesc: 'Intelligent pricing with real-time availability and cost optimization',
//                 description: 'Smart menu management with dynamic pricing, real-time ingredient tracking, and automated availability updates',
//                 benefits: 'Optimize profitability with intelligent menu engineering that analyzes ingredient costs, popularity, and profit margins. Real-time inventory integration automatically updates item availability while dynamic pricing maximizes revenue during peak and off-peak periods.',
//                 tags: ['Dynamic Pricing', 'Real-Time Availability', 'Cost Optimization']
//             },
//             {
//                 id: 'website-management',
//                 icon: '🌐',
//                 title: 'Restaurant Website Hub',
//                 shortDesc: 'SEO-optimized presence with reservation integration and content management',
//                 description: 'Complete website management with SEO optimization, online reservations, menu displays, and content management',
//                 benefits: 'Attract more customers with an SEO-optimized website featuring integrated reservations, dynamic menu displays, and engaging content management. Analytics track visitor behavior and conversion rates, helping optimize your online presence for maximum revenue impact.',
//                 tags: ['SEO Optimization', 'Reservation Integration', 'Content Management']
//             },
//             {
//                 id: 'marketing-automation',
//                 icon: '📢',
//                 title: 'Restaurant Marketing Suite',
//                 shortDesc: 'Social media automation with campaign management and customer engagement',
//                 description: 'Integrated marketing platform with social media management, email campaigns, and customer engagement automation',
//                 benefits: 'Drive repeat business with automated marketing campaigns, social media scheduling, and targeted promotions based on customer behavior. Email marketing integration sends personalized offers, birthday promotions, and re-engagement campaigns to boost customer lifetime value by 45%.',
//                 tags: ['Social Media Automation', 'Email Campaigns', 'Targeted Promotions']
//             },
//             {
//                 id: 'restaurant-analytics',
//                 icon: '📈',
//                 title: 'Restaurant Performance Analytics',
//                 shortDesc: 'Sales insights with menu optimization and customer behavior analysis',
//                 description: 'Comprehensive analytics covering sales performance, menu item analysis, customer behavior, and operational efficiency',
//                 benefits: 'Make informed decisions with detailed analytics on sales trends, popular menu items, peak hours, and customer preferences. Predictive analytics help optimize staffing, inventory, and pricing strategies while identifying opportunities for menu engineering and promotional campaigns.',
//                 tags: ['Sales Analytics', 'Menu Optimization', 'Customer Behavior']
//             }
//         ]
//     ];

//     // Cloud definitions with enhanced styling
//     const clouds = [
//         {
//             name: "Simply-Sales",
//             subtitle: "Intelligent Sales Management",
//             description: "AI-powered sales automation with predictive insights",
//             gradient: "from-purple-500 to-pink-500",
//             bgGradient: "from-purple-900/20 to-pink-900/20",
//             icon: "💼"
//         },
//         {
//             name: "Simply-Service",
//             subtitle: "Customer Service Excellence",
//             description: "Omnichannel support with intelligent case management",
//             gradient: "from-blue-500 to-cyan-500",
//             bgGradient: "from-blue-900/20 to-cyan-900/20",
//             icon: "🎯"
//         },
//         {
//             name: "Simply-Inventory",
//             subtitle: "Smart Warehouse Management",
//             description: "Real-time inventory with predictive analytics",
//             gradient: "from-green-500 to-emerald-500",
//             bgGradient: "from-green-900/20 to-emerald-900/20",
//             icon: "📦"
//         },
//         {
//             name: "Simply-Restaurant",
//             subtitle: "Complete Restaurant Operations",
//             description: "End-to-end restaurant management platform",
//             gradient: "from-orange-500 to-red-500",
//             bgGradient: "from-orange-900/20 to-red-900/20",
//             icon: "🍽️"
//         }
//     ];

//     // Toggle expanded feature
//     const toggleFeature = (id) => {
//         setExpandedFeature(expandedFeature === id ? null : id);
//     };

//     return (
//         <section id="features" className="py-20 relative overflow-hidden bg-black">
//             {/* Dynamic background elements */}
//             <div className="absolute inset-0 z-0">
//                 <div className={`absolute inset-0 bg-gradient-to-br ${clouds[activeTab].bgGradient} transition-all duration-1000`}></div>
//                 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-black/50 to-black"></div>
//             </div>

//             {/* Animated background particles */}
//             <div className="absolute inset-0 z-0">
//                 {[...Array(20)].map((_, i) => (
//                     <motion.div
//                         key={i}
//                         className="absolute w-1 h-1 bg-white rounded-full opacity-20"
//                         animate={{
//                             x: [0, 100, 0],
//                             y: [0, -100, 0],
//                             opacity: [0.2, 0.8, 0.2]
//                         }}
//                         transition={{
//                             duration: 10 + i * 0.5,
//                             repeat: Infinity,
//                             delay: i * 0.2
//                         }}
//                         style={{
//                             left: `${Math.random() * 100}%`,
//                             top: `${Math.random() * 100}%`
//                         }}
//                     />
//                 ))}
//             </div>

//             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
//                 {/* Section Header */}
//                 <div className="text-center mb-16">
//                     <motion.div
//                         initial={{ opacity: 0, y: 20 }}
//                         whileInView={{ opacity: 1, y: 0 }}
//                         viewport={{ once: true }}
//                         transition={{ duration: 0.5 }}
//                         className="inline-block"
//                     >
//                         <span className="bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/20">
//                             <Sparkles className="inline w-4 h-4 mr-2" />
//                             Powerful Cloud Solutions
//                         </span>
//                     </motion.div>

//                     <motion.h2
//                         initial={{ opacity: 0, y: 20 }}
//                         whileInView={{ opacity: 1, y: 0 }}
//                         viewport={{ once: true }}
//                         transition={{ duration: 0.5, delay: 0.1 }}
//                         className="text-5xl font-bold mt-6 mb-4"
//                     >
//                         <span className={`bg-gradient-to-r ${clouds[activeTab].gradient} bg-clip-text text-transparent`}>
//                             SimpliDone
//                         </span>{" "}
//                         <span className="text-white">Clouds</span>
//                     </motion.h2>

//                     <motion.p
//                         initial={{ opacity: 0, y: 20 }}
//                         whileInView={{ opacity: 1, y: 0 }}
//                         viewport={{ once: true }}
//                         transition={{ duration: 0.5, delay: 0.2 }}
//                         className="text-xl text-gray-300 max-w-3xl mx-auto"
//                     >
//                         Experience the future of business management with our AI-powered cloud solutions
//                         designed to transform your operations
//                     </motion.p>
//                 </div>

//                 {/* Enhanced Cloud Navigation */}
//                 <div className="mb-16">
//                     <div className="flex flex-wrap justify-center gap-4 mb-8">
//                         {clouds.map((cloud, index) => (
//                             <motion.button
//                                 key={index}
//                                 whileHover={{ y: -4, scale: 1.02 }}
//                                 whileTap={{ y: 0, scale: 0.98 }}
//                                 onClick={() => setActiveTab(index)}
//                                 className={`relative group px-6 py-4 rounded-2xl font-medium text-sm transition-all duration-300 overflow-hidden ${activeTab === index
//                                         ? "text-white shadow-2xl"
//                                         : "text-gray-300 hover:text-white"
//                                     }`}
//                             >
//                                 {/* Background gradient */}
//                                 <div className={`absolute inset-0 bg-gradient-to-r ${cloud.gradient} transition-opacity duration-300 ${activeTab === index ? "opacity-100" : "opacity-0 group-hover:opacity-30"
//                                     }`}></div>

//                                 {/* Glass morphism background */}
//                                 <div className="absolute inset-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"></div>

//                                 <div className="relative flex items-center space-x-3">
//                                     <span className="text-2xl">{cloud.icon}</span>
//                                     <div className="text-left">
//                                         <div className="font-bold">{cloud.name}</div>
//                                         <div className="text-xs opacity-75">{cloud.subtitle}</div>
//                                     </div>
//                                 </div>

//                                 {activeTab === index && (
//                                     <motion.div
//                                         initial={{ scaleX: 0 }}
//                                         animate={{ scaleX: 1 }}
//                                         className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full"
//                                     />
//                                 )}
//                             </motion.button>
//                         ))}
//                     </div>

//                     {/* Active cloud description */}
//                     <motion.div
//                         key={activeTab}
//                         initial={{ opacity: 0, y: 10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.3 }}
//                         className="text-center"
//                     >
//                         <p className="text-gray-400 max-w-2xl mx-auto">
//                             {clouds[activeTab].description}
//                         </p>
//                     </motion.div>
//                 </div>

//                 {/* Enhanced Features Grid */}
//                 <AnimatePresence mode="wait">
//                     <motion.div
//                         key={activeTab}
//                         initial={{ opacity: 0, y: 30 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -30 }}
//                         transition={{ duration: 0.6 }}
//                         className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
//                     >
//                         {cloudFeatures[activeTab].map((feature, index) => (
//                             <motion.div
//                                 key={feature.id}
//                                 initial={{ opacity: 0, y: 30 }}
//                                 animate={{ opacity: 1, y: 0 }}
//                                 transition={{ duration: 0.6, delay: index * 0.1 }}
//                                 className="h-full"
//                             >
//                                 <div
//                                     className={`h-full rounded-2xl overflow-hidden border transition-all duration-300 group ${expandedFeature === feature.id
//                                             ? `border-white/30 shadow-2xl shadow-white/10`
//                                             : "border-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-white/5"
//                                         }`}
//                                     style={{
//                                         background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
//                                         backdropFilter: 'blur(10px)'
//                                     }}
//                                 >
//                                     {/* Feature Card Header */}
//                                     <div
//                                         onClick={() => toggleFeature(feature.id)}
//                                         className="p-6 cursor-pointer"
//                                     >
//                                         <div className="flex justify-between items-start mb-4">
//                                             <div className="flex items-center">
//                                                 <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl text-3xl mr-4"
//                                                     style={{
//                                                         background: `linear-gradient(135deg, ${clouds[activeTab].gradient.split(' ')[1]} 0%, ${clouds[activeTab].gradient.split(' ')[3]} 100%)`,
//                                                         backdropFilter: 'blur(10px)'
//                                                     }}>
//                                                     {feature.icon}
//                                                 </div>
//                                                 <div>
//                                                     <h3 className="text-xl font-bold text-white mb-1">
//                                                         {feature.title}
//                                                     </h3>
//                                                     <div className="flex flex-wrap gap-1 mb-2">
//                                                         {feature.tags.map((tag, tagIndex) => (
//                                                             <span key={tagIndex} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">
//                                                                 {tag}
//                                                             </span>
//                                                         ))}
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <button className="flex-shrink-0 text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
//                                                 {expandedFeature === feature.id ? (
//                                                     <ChevronDown size={20} />
//                                                 ) : (
//                                                     <Plus size={20} />
//                                                 )}
//                                             </button>
//                                         </div>

//                                         <p className="text-gray-300 text-sm leading-relaxed">{feature.shortDesc}</p>
//                                     </div>

//                                     {/* Expandable Content */}
//                                     <AnimatePresence>
//                                         {expandedFeature === feature.id && (
//                                             <motion.div
//                                                 initial={{ height: 0, opacity: 0 }}
//                                                 animate={{ height: "auto", opacity: 1 }}
//                                                 exit={{ height: 0, opacity: 0 }}
//                                                 transition={{ duration: 0.4 }}
//                                                 className="overflow-hidden"
//                                             >
//                                                 <div className="px-6 pb-6 border-t border-white/10 pt-6">
//                                                     <div className="mb-6">
//                                                         <div className="flex items-center mb-3">
//                                                             <Brain className="w-4 h-4 mr-2 text-blue-400" />
//                                                             <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide">
//                                                                 Feature Details
//                                                             </span>
//                                                         </div>
//                                                         <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
//                                                     </div>

//                                                     <div className="mb-6">
//                                                         <div className="flex items-center mb-3">
//                                                             <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
//                                                             <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">
//                                                                 Key Benefits
//                                                             </span>
//                                                         </div>
//                                                         <p className="text-gray-300 text-sm leading-relaxed">{feature.benefits}</p>
//                                                     </div>

//                                                     <div className="flex items-center justify-between pt-4 border-t border-white/10">
//                                                         {/* <button className="group text-white text-sm font-medium flex items-center hover:text-gray-300 transition-colors">
//                                                             Learn more
//                                                             <ChevronRight size={16} className="ml-1 group-hover:ml-2 transition-all" />
//                                                         </button> */}
//                                                         <div className="flex items-center space-x-2 text-xs text-gray-400">
//                                                             <Zap className="w-3 h-3" />
//                                                             <span>AI-Powered</span>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </motion.div>
//                                         )}
//                                     </AnimatePresence>
//                                 </div>
//                             </motion.div>
//                         ))}
//                     </motion.div>
//                 </AnimatePresence>

//                 {/* Enhanced Bottom CTA */}
//                 <motion.div
//                     initial={{ opacity: 0, y: 20 }}
//                     whileInView={{ opacity: 1, y: 0 }}
//                     viewport={{ once: true }}
//                     transition={{ duration: 0.5 }}
//                     className="mt-20 text-center"
//                 >
//                     <div className="relative">
//                         <motion.a
//                             href="#contact"
//                             whileHover={{ scale: 1.05, y: -2 }}
//                             whileTap={{ scale: 0.95 }}
//                             className={`inline-flex items-center justify-center px-10 py-5 rounded-2xl text-white text-lg font-medium bg-gradient-to-r ${clouds[activeTab].gradient} shadow-2xl transition-all relative overflow-hidden group`}
//                         >
//                             <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
//                             <Globe className="mr-3 w-5 h-5 relative z-10" />
//                             <span className="relative z-10">Explore {clouds[activeTab].name}</span>
//                         </motion.a>
//                     </div>

//                     <p className="text-gray-400 text-sm mt-4">
//                         Start your free trial today • No credit card required
//                     </p>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }


import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, ArrowRight, Sparkles } from 'lucide-react';

export function FeaturesHubSection() {
    const [activeTab, setActiveTab] = useState(0);
    const [hoveredFeature, setHoveredFeature] = useState(null);

    // Simplified cloud features with powerful descriptions
    const cloudFeatures = [
        // Simply-Sales
        [
            {
                id: 'sales-pipeline',
                icon: '🎯',
                title: 'Smart Sales Pipeline',
                description: 'AI-powered lead management with predictive analytics',
                benefits: ['40% faster deal closure', 'Automated follow-ups', 'Revenue forecasting']
            },
            {
                id: 'contact-management',
                icon: '👥',
                title: 'Unified Customer Hub',
                description: '360-degree customer view with interaction history',
                benefits: ['Complete customer profiles', 'Interaction tracking', 'Relationship mapping']
            },
            {
                id: 'sales-automation',
                icon: '⚡',
                title: 'Sales Automation',
                description: 'Automate quotes, orders, and email sequences',
                benefits: ['Quote generation', 'Order processing', 'Email automation']
            },
            {
                id: 'sales-analytics',
                icon: '📊',
                title: 'Performance Analytics',
                description: 'Real-time insights and forecasting tools',
                benefits: ['Sales dashboards', 'Performance metrics', 'Trend analysis']
            }
        ],
        // Simply-Service
        [
            {
                id: 'case-management',
                icon: '🎫',
                title: 'Smart Case Management',
                description: 'AI-powered ticket routing and SLA tracking',
                benefits: ['Auto-assignment', 'SLA monitoring', 'Escalation workflows']
            },
            {
                id: 'omnichannel',
                icon: '🌐',
                title: 'Omnichannel Support',
                description: 'Unified support across email, chat, and phone',
                benefits: ['Multi-channel support', 'Conversation history', 'Agent collaboration']
            },
            {
                id: 'knowledge-base',
                icon: '📚',
                title: 'Knowledge Management',
                description: 'Self-service portal with smart suggestions',
                benefits: ['FAQ automation', 'Solution database', 'Customer self-service']
            },
            {
                id: 'service-analytics',
                icon: '📈',
                title: 'Service Insights',
                description: 'Customer satisfaction and performance tracking',
                benefits: ['CSAT tracking', 'Response time metrics', 'Agent performance']
            }
        ],
        // Simply-Inventory
        [
            {
                id: 'inventory-tracking',
                icon: '📦',
                title: 'Real-Time Inventory',
                description: 'Live stock monitoring with automated alerts',
                benefits: ['Stock level alerts', 'Multi-location tracking', 'Reorder automation']
            },
            {
                id: 'purchase-management',
                icon: '🛒',
                title: 'Purchase Optimization',
                description: 'Intelligent ordering with vendor management',
                benefits: ['Vendor tracking', 'Cost optimization', 'Order automation']
            },
            {
                id: 'warehouse-ops',
                icon: '🏭',
                title: 'Warehouse Operations',
                description: 'Efficient picking, packing, and shipping',
                benefits: ['Pick optimization', 'Shipping integration', 'Barcode scanning']
            },
            {
                id: 'inventory-analytics',
                icon: '💡',
                title: 'Inventory Intelligence',
                description: 'Demand forecasting and profitability analysis',
                benefits: ['Demand forecasting', 'Profit analysis', 'Trend identification']
            }
        ],
        // Simply-Restaurant
        [
            {
                id: 'menu-management',
                icon: '🍽️',
                title: 'Dynamic Menu Management',
                description: 'Smart pricing with real-time availability',
                benefits: ['Dynamic pricing', 'Inventory integration', 'Menu optimization']
            },
            {
                id: 'online-ordering',
                icon: '📱',
                title: 'Online Ordering Platform',
                description: 'Multi-platform ordering with delivery tracking',
                benefits: ['Web & mobile orders', 'Payment processing', 'Delivery tracking']
            },
            {
                id: 'customer-loyalty',
                icon: '⭐',
                title: 'Customer Loyalty System',
                description: 'Automated rewards and personalized experiences',
                benefits: ['Loyalty programs', 'Personalized offers', 'Customer insights']
            },
            {
                id: 'restaurant-analytics',
                icon: '📊',
                title: 'Restaurant Intelligence',
                description: 'Sales analytics and operational insights',
                benefits: ['Sales reporting', 'Menu performance', 'Customer behavior']
            }
        ]
    ];

    // Enhanced cloud definitions
    const clouds = [
        {
            name: "Simply-Sales",
            subtitle: "AI-Powered Sales Engine",
            description: "Close more deals with intelligent automation",
            accent: "#3B82F6"
        },
        {
            name: "Simply-Service",
            subtitle: "Customer Success Platform",
            description: "Deliver exceptional customer experiences",
            accent: "#10B981"
        },
        {
            name: "Simply-Inventory",
            subtitle: "Smart Warehouse Management",
            description: "Optimize inventory with predictive insights",
            accent: "#F59E0B"
        },
        {
            name: "Simply-Restaurant",
            subtitle: "Complete Restaurant Solution",
            description: "From orders to analytics, everything you need",
            accent: "#EF4444"
        }
    ];

    const scrollToContact = () => {
        const element = document.getElementById('contact');
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    return (
        <section className="py-24 relative overflow-hidden bg-black">
            {/* Subtle animated background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/20 mb-6"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">All-in-One Business Platform</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
                    >
                        Four Powerful
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Business Solutions
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-gray-300 max-w-3xl mx-auto font-light"
                    >
                        Everything you need to run your business - from sales and customer service
                        to inventory management and restaurant operations.
                    </motion.p>
                </div>

                {/* Cloud Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-4 mb-16"
                >
                    {clouds.map((cloud, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveTab(index)}
                            className={`group relative px-6 py-4 rounded-2xl font-medium transition-all duration-300 ${activeTab === index
                                    ? 'bg-white text-black scale-105'
                                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20'
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <div
                                    className={`w-3 h-3 rounded-full transition-colors ${activeTab === index ? 'bg-black' : 'bg-white/60'
                                        }`}
                                    style={{ backgroundColor: activeTab === index ? cloud.accent : undefined }}
                                ></div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">{cloud.name}</div>
                                    <div className="text-sm opacity-75">{cloud.subtitle}</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </motion.div>

                {/* Active Cloud Description */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-12"
                >
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        {clouds[activeTab].description}
                    </p>
                </motion.div>

                {/* Features Grid */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
                    >
                        {cloudFeatures[activeTab].map((feature, index) => (
                            <motion.div
                                key={feature.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="group"
                                onMouseEnter={() => setHoveredFeature(feature.id)}
                                onMouseLeave={() => setHoveredFeature(null)}
                            >
                                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 h-full">
                                    <div className="flex items-start space-x-4 mb-6">
                                        <div
                                            className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110"
                                            style={{ backgroundColor: `${clouds[activeTab].accent}20` }}
                                        >
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gray-300 transition-colors">
                                                {feature.title}
                                            </h3>
                                            <p className="text-gray-400 leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {feature.benefits.map((benefit, idx) => (
                                            <div key={idx} className="flex items-center space-x-3">
                                                <Check
                                                    className="w-4 h-4 text-green-400 flex-shrink-0"
                                                    style={{ color: clouds[activeTab].accent }}
                                                />
                                                <span className="text-gray-300 text-sm">{benefit}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* <div className="mt-6 pt-6 border-t border-white/10">
                                        <button className="group/btn text-white text-sm font-medium flex items-center hover:text-gray-300 transition-colors">
                                            Learn more
                                            <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:ml-2 transition-all" />
                                        </button>
                                    </div> */}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* Stats Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16"
                >
                    {[
                        { number: "AI", label: "Powered" },
                        { number: "99.9%", label: "Uptime" },
                        { number: "24/7", label: "Support" },
                        { number: "4", label: "Business Solutions" }
                    ].map((stat, index) => (
                        <div key={index} className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">{stat.number}</div>
                            <div className="text-gray-400">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="text-center"
                >
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12">
                        <h3 className="text-3xl font-bold text-white mb-4">
                            Ready to Transform Your Business?
                        </h3>
                        <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                            Start with a 14-day free trial and experience the power of SimpliDone's
                            integrated business platform.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={scrollToContact}
                                className="group bg-white text-black px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-100 transition-all flex items-center gap-2 hover:scale-105"
                            >
                                Start Free Trial
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={scrollToContact}
                                className="border border-white/30 text-white px-8 py-4 rounded-lg text-lg font-medium hover:border-white/50 hover:bg-white/5 transition-all"
                            >
                                Schedule Demo
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm mt-4">
                            No credit card required • Full access to all features
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}