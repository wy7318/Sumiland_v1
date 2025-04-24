
//v2
// import React, { useState, useEffect } from 'react';
// import { createClient } from '@supabase/supabase-js';
// import axios from 'axios';
// import Fuse from 'fuse.js';

// // TypeScript interfaces
// interface Vendor {
//     id: string;
//     name: string;
//     organization_id: string;
// }

// interface InventoryItem {
//     id: string;
//     name: string;
//     quantity: number;
//     unit_price: number;
//     min_price: number;
//     max_price: number;
//     location: string;
//     organization_id: string;
// }

// interface OrderItem {
//     product_name: string;
//     quantity: number;
//     unit_price: number;
//     discount: number;
//     validation_status: string;
// }

// interface ExtractedData {
//     customer: string;
//     quote_order: OrderItem[];
//     note: string;
//     task: string;
//     ambiguities: string;
// }

// // Create SalesAssistant component
// const SalesAssistant: React.FC<{ selectedOrganizationId: string }> = ({ selectedOrganizationId }) => {
//     // State variables
//     const [inputText, setInputText] = useState<string>('');
//     const [processing, setProcessing] = useState<boolean>(false);
//     const [vendors, setVendors] = useState<Vendor[]>([]);
//     const [inventory, setInventory] = useState<InventoryItem[]>([]);
//     const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
//     const [finalData, setFinalData] = useState<ExtractedData | null>(null);
//     const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
//     const [editingCustomer, setEditingCustomer] = useState<boolean>(false);
//     const [editedCustomer, setEditedCustomer] = useState<string>('');
//     const [isRecording, setIsRecording] = useState<boolean>(false);
//     const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

//     // Supabase client
//     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
//     const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
//     const supabase = createClient(supabaseUrl, supabaseKey);

//     // Fetch vendors and inventory when component mounts or organization changes
//     useEffect(() => {
//         if (selectedOrganizationId) {
//             fetchVendors();
//             fetchInventory();
//         }
//     }, [selectedOrganizationId]);

//     // Fetch vendors from Supabase
//     const fetchVendors = async () => {
//         try {
//             const { data, error } = await supabase
//                 .from('vendors')
//                 .select('id, name, organization_id')
//                 .eq('organization_id', selectedOrganizationId);

//             if (error) throw error;
//             setVendors(data || []);
//         } catch (error) {
//             console.error('Error fetching vendors:', error);
//         }
//     };

//     // Fetch inventory from Supabase
//     const fetchInventory = async () => {
//         try {
//             const { data, error } = await supabase
//                 .from('temp_inventory')
//                 .select('*')
//                 .eq('organization_id', selectedOrganizationId);

//             if (error) throw error;
//             setInventory(data || []);
//         } catch (error) {
//             console.error('Error fetching inventory:', error);
//         }
//     };

//     // Handle input change
//     const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//         setInputText(e.target.value);
//     };

//     // Voice recording functions
//     const startRecording = async () => {
//         try {
//             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//             const recorder = new MediaRecorder(stream);
//             const chunks: BlobPart[] = [];

//             recorder.ondataavailable = (e) => {
//                 chunks.push(e.data);
//             };

//             recorder.onstop = async () => {
//                 const audioBlob = new Blob(chunks, { type: 'audio/webm' });
//                 await transcribeAudio(audioBlob);
//             };

//             recorder.start();
//             setMediaRecorder(recorder);
//             setIsRecording(true);
//         } catch (error) {
//             console.error('Error starting recording:', error);
//             alert('Could not access microphone. Please check permissions.');
//         }
//     };

//     const stopRecording = () => {
//         if (mediaRecorder) {
//             mediaRecorder.stop();
//             setIsRecording(false);
//         }
//     };

//     // Transcribe audio using OpenAI Whisper (or your preferred speech-to-text service)
//     const transcribeAudio = async (audioBlob: Blob) => {
//         try {
//             setProcessing(true);
//             const formData = new FormData();
//             formData.append('file', audioBlob, 'recording.webm');
//             formData.append('model', 'whisper-1');

//             const response = await axios.post(
//                 'https://api.openai.com/v1/audio/transcriptions',
//                 formData,
//                 {
//                     headers: {
//                         'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
//                         'Content-Type': 'multipart/form-data'
//                     }
//                 }
//             );

//             if (response.data.text) {
//                 setInputText(prevText => prevText + ' ' + response.data.text.trim());
//             }
//         } catch (error) {
//             console.error('Error transcribing audio:', error);
//             alert('Failed to transcribe audio. Please try typing instead.');
//         } finally {
//             setProcessing(false);
//         }
//     };

//     // Optimize inventory data for OpenAI prompt to reduce token usage
//     const optimizeInventoryForPrompt = (fullInventory: InventoryItem[]) => {
//         // Limit to most relevant items (e.g., 30 max)
//         return fullInventory.slice(0, 30).map(item =>
//             `- ${item.name} (Stock: ${item.quantity}, Unit Price: $${item.unit_price.toFixed(2)}, Min Price: $${item.min_price.toFixed(2)})`
//         ).join('\n');
//     };

//     // Create the prompt for OpenAI
//     const createPrompt = (input: string, inventoryData: InventoryItem[], vendorData: Vendor[]): string => {
//         // Format inventory data (optimized)
//         const inventoryText = optimizeInventoryForPrompt(inventoryData);

//         // Format vendor data (limit to 50 vendors max to save tokens)
//         const vendorText = vendorData.slice(0, 50).map(vendor => `- ${vendor.name}`).join('\n');

//         // Create the prompt using the template
//         return `You are a sales assistant helping a field salesperson extract actionable data from freeform sales notes.
// ---
// Below is the current inventory information:
// ${inventoryText}
// Each product includes:
// - Product Name
// - Inventory (available stock)
// - Unit Price
// - Minimum Price Threshold (the lowest allowed selling price)
// ---
// Below is the current customer list:
// ${vendorText}
// ---
// Now, interpret the following freeform sales note and extract structured data.
// ### Instructions:
// 1. **Identify**:
//    - Customer name
//    - Ordered items with:
//      - Product name
//      - Quantity
//      - Unit price
//      - Discount (if any)
//    - Any other information relevant to:
//      - A **Note** (e.g., delivery date, special instructions)
//      - A **Task** (e.g., follow-up, future reminder)
// 2. **Validate**:
//    - Ensure ordered quantity does not exceed available inventory
//    - Ensure unit price is not below the product's minimum threshold
//    - If either rule is violated, flag it clearly for the user
// 3. **Resolve Ambiguity**:
//    - If a product or customer name is unclear, make the best-guess match and annotate it for user confirmation
//    - Assume typos or similar names might still be intentional (e.g., "Wagu" → "Wagyu")
// 4. **Classify Output** into the following structured format:
//    - **Quote / Order**
//      - List of items with quantity, unit price, and discount
//      - Include validation warnings if any
//    - **Note**
//      - Any details like delivery date or internal comments
//    - **Task**
//      - Any follow-up reminders or actions to take
// ---
// ### Output Format (Strictly Follow)
// **Customer**: [Detected Customer]
// **Quote / Order**:
// | Product Name      | Quantity | Unit Price | Discount | Validation Status |
// |-------------------|----------|------------|----------|-------------------|
// |                   |          |            |          |                   |
// **Note**:
// > [Freeform notes extracted]
// **Task**:
// > [Action items or reminders extracted]
// **Ambiguities (if any)**:
// > [Clearly list any assumptions or uncertainties]
// ---
// Freeform Sales Note:
// ${input}`;
//     };

//     // Process the input with OpenAI API
//     const processInput = async () => {
//         if (!inputText.trim()) return;

//         setProcessing(true);

//         try {
//             // Prepare optimized prompt
//             const prompt = createPrompt(inputText, inventory, vendors);

//             // Call OpenAI API
//             const response = await axios.post(
//                 'https://api.openai.com/v1/chat/completions',
//                 {
//                     model: 'gpt-3.5-turbo',
//                     messages: [
//                         { role: 'system', content: prompt }
//                     ],
//                     temperature: 0.3, // Lower temperature for more consistent results
//                     max_tokens: 1000, // Set limit to control token usage
//                 },
//                 {
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
//                     }
//                 }
//             );

//             // Parse the response
//             const aiResponse = response.data.choices[0].message.content;
//             const parsedData = parseAIResponse(aiResponse);

//             // Validate and match the extracted data
//             const validatedData = validateExtractedData(parsedData);

//             setExtractedData(validatedData);
//             setShowConfirmation(true);

//         } catch (error) {
//             console.error('Error processing input:', error);
//             alert('An error occurred while processing your input. Please try again.');
//         } finally {
//             setProcessing(false);
//         }
//     };

//     // Parse the AI response
//     const parseAIResponse = (response: string): ExtractedData => {
//         // Initialize default structure
//         const defaultData: ExtractedData = {
//             customer: '',
//             quote_order: [],
//             note: '',
//             task: '',
//             ambiguities: ''
//         };

//         try {
//             // Extract customer
//             const customerMatch = response.match(/\*\*Customer\*\*:\s*(.+?)(?=\n\*\*|\n$)/s);
//             if (customerMatch && customerMatch[1]) {
//                 defaultData.customer = customerMatch[1].trim();
//             }

//             // Extract quote/order
//             const tableRows = response.split('\n').filter(row =>
//                 row.trim().startsWith('|') &&
//                 !row.includes('---|---') &&
//                 !row.includes('Product Name')
//             );

//             if (tableRows.length > 0) {
//                 defaultData.quote_order = tableRows.map(row => {
//                     const cells = row.split('|').filter(cell => cell.trim() !== '');
//                     if (cells.length >= 5) {
//                         return {
//                             product_name: cells[0].trim(),
//                             quantity: parseInt(cells[1].trim()) || 0,
//                             unit_price: parseFloat(cells[2].trim().replace('$', '')) || 0,
//                             discount: parseFloat(cells[3].trim().replace('%', '')) || 0,
//                             validation_status: cells[4].trim()
//                         };
//                     }
//                     return null;
//                 }).filter(Boolean) as OrderItem[];
//             }

//             // Extract note
//             const noteMatch = response.match(/\*\*Note\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
//             if (noteMatch && noteMatch[1]) {
//                 defaultData.note = noteMatch[1].trim();
//             }

//             // Extract task
//             const taskMatch = response.match(/\*\*Task\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
//             if (taskMatch && taskMatch[1]) {
//                 defaultData.task = taskMatch[1].trim();
//             }

//             // Extract ambiguities
//             const ambiguitiesMatch = response.match(/\*\*Ambiguities \(if any\)\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
//             if (ambiguitiesMatch && ambiguitiesMatch[1]) {
//                 defaultData.ambiguities = ambiguitiesMatch[1].trim();
//             }

//             return defaultData;
//         } catch (error) {
//             console.error('Error parsing AI response:', error);
//             return defaultData;
//         }
//     };

//     // Validate and match the extracted data
//     const validateExtractedData = (data: ExtractedData): ExtractedData => {
//         const validatedData = { ...data };

//         // Match customer name using fuzzy search
//         if (data.customer && vendors.length > 0) {
//             const fuseOptions = {
//                 keys: ['name'],
//                 threshold: 0.4 // Lower threshold means more strict matching
//             };

//             const fuse = new Fuse(vendors, fuseOptions);
//             const results = fuse.search(data.customer);

//             if (results.length > 0) {
//                 validatedData.customer = results[0].item.name;
//             }
//         }

//         // Validate and match products
//         if (data.quote_order && data.quote_order.length > 0) {
//             validatedData.quote_order = data.quote_order.map(item => {
//                 const matchedItem = findMatchingInventoryItem(item.product_name, inventory);

//                 // Create a new order item with validation
//                 const validatedItem: OrderItem = {
//                     ...item,
//                     validation_status: 'Valid'
//                 };

//                 if (matchedItem) {
//                     // Check quantity
//                     if (item.quantity > matchedItem.quantity) {
//                         validatedItem.validation_status = `Warning: Quantity exceeds available stock (${matchedItem.quantity})`;
//                     }

//                     // Check price
//                     if (item.unit_price < matchedItem.min_price) {
//                         validatedItem.validation_status = validatedItem.validation_status === 'Valid'
//                             ? `Warning: Price below minimum (${matchedItem.min_price})`
//                             : `${validatedItem.validation_status}, Price below minimum (${matchedItem.min_price})`;
//                     }

//                     // Calculate discount if not provided
//                     if (!item.discount && matchedItem.unit_price > 0) {
//                         const calculatedDiscount = Math.round(
//                             ((matchedItem.unit_price - item.unit_price) / matchedItem.unit_price) * 100
//                         );
//                         validatedItem.discount = calculatedDiscount > 0 ? calculatedDiscount : 0;
//                     }
//                 } else {
//                     validatedItem.validation_status = 'Warning: Product not found in inventory';
//                 }

//                 return validatedItem;
//             });
//         }

//         return validatedData;
//     };

//     // Find matching inventory item using fuzzy search
//     const findMatchingInventoryItem = (productName: string, inventoryItems: InventoryItem[]): InventoryItem | null => {
//         if (!productName || inventoryItems.length === 0) {
//             return null;
//         }

//         const fuseOptions = {
//             keys: ['name'],
//             threshold: 0.4
//         };

//         const fuse = new Fuse(inventoryItems, fuseOptions);
//         const results = fuse.search(productName);

//         return results.length > 0 ? results[0].item : null;
//     };

//     // Handle customer edit toggle
//     const toggleCustomerEdit = () => {
//         if (editingCustomer) {
//             // Save the edited customer name
//             if (extractedData) {
//                 setExtractedData({
//                     ...extractedData,
//                     customer: editedCustomer
//                 });
//             }
//         } else {
//             // Start editing and initialize with current value
//             setEditedCustomer(extractedData?.customer || '');
//         }

//         setEditingCustomer(!editingCustomer);
//     };

//     // Handle customer name change
//     const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setEditedCustomer(e.target.value);
//     };

//     // Handle order item edit
//     const handleOrderItemEdit = (index: number, field: keyof OrderItem, value: string | number) => {
//         if (!extractedData) return;

//         const updatedOrder = [...extractedData.quote_order];
//         updatedOrder[index] = {
//             ...updatedOrder[index],
//             [field]: typeof value === 'string' && field !== 'product_name' ? parseFloat(value as string) : value
//         };

//         // Re-validate the item
//         const item = updatedOrder[index];
//         const matchedInventory = findMatchingInventoryItem(item.product_name, inventory);

//         if (matchedInventory) {
//             let validationStatus = 'Valid';

//             if (item.quantity > matchedInventory.quantity) {
//                 validationStatus = `Warning: Quantity exceeds available stock (${matchedInventory.quantity})`;
//             }

//             if (item.unit_price < matchedInventory.min_price) {
//                 validationStatus = validationStatus === 'Valid'
//                     ? `Warning: Price below minimum (${matchedInventory.min_price})`
//                     : `${validationStatus}, Price below minimum (${matchedInventory.min_price})`;
//             }

//             updatedOrder[index].validation_status = validationStatus;
//         }

//         setExtractedData({
//             ...extractedData,
//             quote_order: updatedOrder
//         });
//     };

//     // Handle note edit
//     const handleNoteEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//         if (!extractedData) return;

//         setExtractedData({
//             ...extractedData,
//             note: e.target.value
//         });
//     };

//     // Handle task edit
//     const handleTaskEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//         if (!extractedData) return;

//         setExtractedData({
//             ...extractedData,
//             task: e.target.value
//         });
//     };

//     // Confirm the extracted data
//     const confirmData = () => {
//         setFinalData(extractedData);
//         setShowConfirmation(false);
//         // Save data to database
//         saveData();
//     };

//     // Cancel the confirmation
//     const cancelConfirmation = () => {
//         setShowConfirmation(false);
//         setExtractedData(null);
//     };

//     // Save the final data
//     const saveData = async () => {
//         if (!finalData) return;

//         try {
//             // Find matching vendor
//             const vendorMatch = vendors.find(v => v.name === finalData.customer);

//             if (finalData.quote_order.length > 0) {
//                 // Save order to database
//                 const { error } = await supabase
//                     .from('orders')
//                     .insert({
//                         vendor_id: vendorMatch?.id || null,
//                         organization_id: selectedOrganizationId,
//                         items: finalData.quote_order,
//                         notes: finalData.note,
//                         created_at: new Date().toISOString()
//                     });

//                 if (error) throw error;
//             }

//             if (finalData.task) {
//                 // Save task to database
//                 const { error } = await supabase
//                     .from('tasks')
//                     .insert({
//                         description: finalData.task,
//                         organization_id: selectedOrganizationId,
//                         vendor_id: vendorMatch?.id || null,
//                         created_at: new Date().toISOString()
//                     });

//                 if (error) throw error;
//             }

//             alert('Data saved successfully!');
//             setInputText('');
//             setFinalData(null);

//         } catch (error) {
//             console.error('Error saving data:', error);
//             alert('An error occurred while saving the data. Please try again.');
//         }
//     };

//     return (
//         <div className="sales-assistant p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
//             <h1 className="text-2xl font-bold mb-4 text-gray-800">Sales Assistant</h1>

//             {/* Input Section */}
//             <div className="mb-6">
//                 <label className="block text-sm font-medium mb-2 text-gray-700">
//                     Enter your sales notes:
//                 </label>
//                 <div className="relative">
//                     <textarea
//                         className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
//                         value={inputText}
//                         onChange={handleInputChange}
//                         placeholder="Enter your notes about customer interaction here..."
//                         disabled={processing}
//                     />
//                     <div className="absolute bottom-3 right-3 flex space-x-2">
//                         {isRecording ? (
//                             <button
//                                 onClick={stopRecording}
//                                 className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none"
//                                 title="Stop recording"
//                             >
//                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                                     <rect x="6" y="6" width="8" height="8" />
//                                 </svg>
//                             </button>
//                         ) : (
//                             <button
//                                 onClick={startRecording}
//                                 className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 focus:outline-none"
//                                 title="Start recording"
//                                 disabled={processing}
//                             >
//                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                                     <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
//                                 </svg>
//                             </button>
//                         )}
//                     </div>
//                 </div>
//                 <button
//                     className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition duration-200 flex items-center"
//                     onClick={processInput}
//                     disabled={processing || !inputText.trim()}
//                 >
//                     {processing ? (
//                         <>
//                             <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                             </svg>
//                             Processing...
//                         </>
//                     ) : (
//                         'Process Notes'
//                     )}
//                 </button>
//             </div>

//             {/* Confirmation Dialog */}
//             {showConfirmation && extractedData && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//                     <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
//                         <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Extracted Data</h2>

//                         {/* Restaurant/Customer Section */}
//                         <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//                             <div className="flex justify-between items-center">
//                                 <h3 className="font-semibold text-gray-700">Customer/Restaurant</h3>
//                                 <button
//                                     className="text-blue-600 hover:text-blue-800 font-medium text-sm"
//                                     onClick={toggleCustomerEdit}
//                                 >
//                                     {editingCustomer ? 'Save' : 'Edit'}
//                                 </button>
//                             </div>

//                             {editingCustomer ? (
//                                 <input
//                                     type="text"
//                                     className="mt-2 w-full p-2 border border-gray-300 rounded-md"
//                                     value={editedCustomer}
//                                     onChange={handleCustomerChange}
//                                 />
//                             ) : (
//                                 <p className="mt-2 text-gray-900 font-medium">{extractedData.customer || 'Not detected'}</p>
//                             )}
//                         </div>

//                         {/* Quote/Order Section */}
//                         <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//                             <h3 className="font-semibold mb-3 text-gray-700">Quote / Order</h3>

//                             {extractedData.quote_order.length > 0 ? (
//                                 <div className="overflow-x-auto">
//                                     <table className="min-w-full divide-y divide-gray-200">
//                                         <thead className="bg-gray-100">
//                                             <tr>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody className="bg-white divide-y divide-gray-200">
//                                             {extractedData.quote_order.map((item, index) => (
//                                                 <tr key={index} className={item.validation_status !== 'Valid' ? 'bg-yellow-50' : ''}>
//                                                     <td className="py-2 px-3">
//                                                         <input
//                                                             type="text"
//                                                             className="w-full p-1 border rounded"
//                                                             value={item.product_name}
//                                                             onChange={(e) => handleOrderItemEdit(index, 'product_name', e.target.value)}
//                                                         />
//                                                     </td>
//                                                     <td className="py-2 px-3">
//                                                         <input
//                                                             type="number"
//                                                             className="w-full p-1 border rounded"
//                                                             value={item.quantity}
//                                                             onChange={(e) => handleOrderItemEdit(index, 'quantity', parseInt(e.target.value) || 0)}
//                                                         />
//                                                     </td>
//                                                     <td className="py-2 px-3">
//                                                         <input
//                                                             type="number"
//                                                             step="0.01"
//                                                             className="w-full p-1 border rounded"
//                                                             value={item.unit_price}
//                                                             onChange={(e) => handleOrderItemEdit(index, 'unit_price', parseFloat(e.target.value) || 0)}
//                                                         />
//                                                     </td>
//                                                     <td className="py-2 px-3">
//                                                         <div className="flex items-center">
//                                                             <input
//                                                                 type="number"
//                                                                 className="w-16 p-1 border rounded"
//                                                                 value={item.discount}
//                                                                 onChange={(e) => handleOrderItemEdit(index, 'discount', parseInt(e.target.value) || 0)}
//                                                             />
//                                                             <span className="ml-1">%</span>
//                                                         </div>
//                                                     </td>
//                                                     <td className={`py-2 px-3 text-sm ${item.validation_status !== 'Valid' ? 'text-red-600' : 'text-green-600'}`}>
//                                                         {item.validation_status}
//                                                     </td>
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             ) : (
//                                 <p className="text-gray-500 italic">No order items detected</p>
//                             )}
//                         </div>

//                         {/* Task Section */}
//                         <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//                             <h3 className="font-semibold mb-2 text-gray-700">Task</h3>
//                             <textarea
//                                 className="w-full p-2 border border-gray-300 rounded-md"
//                                 value={extractedData.task}
//                                 onChange={handleTaskEdit}
//                                 rows={2}
//                                 placeholder="No tasks detected"
//                             />
//                         </div>

//                         {/* Notes Section */}
//                         <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//                             <h3 className="font-semibold mb-2 text-gray-700">Notes</h3>
//                             <textarea
//                                 className="w-full p-2 border border-gray-300 rounded-md"
//                                 value={extractedData.note}
//                                 onChange={handleNoteEdit}
//                                 rows={3}
//                                 placeholder="No notes detected"
//                             />
//                         </div>

//                         {/* Ambiguities Section */}
//                         {extractedData.ambiguities && (
//                             <div className="mb-4 p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
//                                 <h3 className="font-semibold mb-2 text-yellow-800">Ambiguities</h3>
//                                 <p className="text-yellow-700">{extractedData.ambiguities}</p>
//                             </div>
//                         )}

//                         {/* Action Buttons */}
//                         <div className="flex justify-end gap-3 mt-6">
//                             <button
//                                 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition duration-200"
//                                 onClick={cancelConfirmation}
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
//                                 onClick={confirmData}
//                             >
//                                 Confirm & Save
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Success Message */}
//             {finalData && (
//                 <div className="mt-6 p-4 border border-green-200 rounded-lg bg-green-50">
//                     <div className="flex items-center">
//                         <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                         </svg>
//                         <h2 className="text-lg font-semibold text-green-800">Data Saved Successfully!</h2>
//                     </div>
//                     <ul className="mt-2 text-green-700">
//                         <li>Customer: {finalData.customer}</li>
//                         <li>Items: {finalData.quote_order.length}</li>
//                         {finalData.task && <li>Task created: {finalData.task}</li>}
//                     </ul>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default SalesAssistant;


//v3
// import React, { useState, useEffect } from 'react';
// import { supabase } from '../../lib/supabase';
// import axios from 'axios';
// import Fuse from 'fuse.js';
// import { motion } from 'framer-motion';
// import { generateContent, OPENAI_MODELS } from '../../services/aiService';
// import { useOrganization } from '../../contexts/OrganizationContext';

// // TypeScript interfaces
// interface Vendor {
//     id: string;
//     name: string;
//     organization_id: string;
// }

// interface InventoryItem {
//     id: string;
//     name: string;
//     quantity: number;
//     unit_price: number;
//     min_price: number;
//     max_price: number;
//     location: string;
//     organization_id: string;
// }

// interface OrderItem {
//     product_name: string;
//     quantity: number;
//     unit_price: number;
//     discount: number;
//     validation_status: string;
// }

// interface ExtractedData {
//     customer: string;
//     quote_order: OrderItem[];
//     note: string;
//     task: string;
//     ambiguities: string;
// }

// // Create SalesAssistant component
// const SalesAssistant: React.FC = () => {
//     // Organization context
//     const { selectedOrganization } = useOrganization();
//     const selectedOrganizationId = selectedOrganization?.id;

//     // State variables
//     const [inputText, setInputText] = useState<string>('');
//     const [processing, setProcessing] = useState<boolean>(false);
//     const [vendors, setVendors] = useState<Vendor[]>([]);
//     const [inventory, setInventory] = useState<InventoryItem[]>([]);
//     const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
//     const [finalData, setFinalData] = useState<ExtractedData | null>(null);
//     const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
//     const [editingCustomer, setEditingCustomer] = useState<boolean>(false);
//     const [editedCustomer, setEditedCustomer] = useState<string>('');
//     const [isRecording, setIsRecording] = useState<boolean>(false);
//     const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
//     const [error, setError] = useState<string | null>(null);

//     // Fetch vendors and inventory when component mounts or organization changes
//     useEffect(() => {
//         if (selectedOrganizationId) {
//             fetchVendors();
//             fetchInventory();
//         }
//     }, [selectedOrganizationId]);

//     // Show error message if no organization is selected
//     useEffect(() => {
//         if (!selectedOrganizationId) {
//             setError('Please select an organization to use the Sales Assistant');
//         } else {
//             setError(null);
//         }
//     }, [selectedOrganizationId]);

//     // Fetch vendors from Supabase
//     const fetchVendors = async () => {
//         try {
//             const { data, error } = await supabase
//                 .from('vendors')
//                 .select('id, name, organization_id')
//                 .eq('organization_id', selectedOrganizationId);

//             if (error) throw error;
//             setVendors(data || []);
//         } catch (error) {
//             console.error('Error fetching vendors:', error);
//         }
//     };

//     // Fetch inventory from Supabase
//     const fetchInventory = async () => {
//         try {
//             const { data, error } = await supabase
//                 .from('temp_inventory')
//                 .select('*')
//                 .eq('organization_id', selectedOrganizationId);

//             if (error) throw error;
//             setInventory(data || []);
//         } catch (error) {
//             console.error('Error fetching inventory:', error);
//         }
//     };

//     // Handle input change
//     const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//         setInputText(e.target.value);
//     };

//     // Voice recording functions
//     const startRecording = async () => {
//         try {
//             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//             const recorder = new MediaRecorder(stream);
//             const chunks: BlobPart[] = [];

//             recorder.ondataavailable = (e) => {
//                 chunks.push(e.data);
//             };

//             recorder.onstop = async () => {
//                 const audioBlob = new Blob(chunks, { type: 'audio/webm' });
//                 await transcribeAudio(audioBlob);
//             };

//             recorder.start();
//             setMediaRecorder(recorder);
//             setIsRecording(true);
//         } catch (error) {
//             console.error('Error starting recording:', error);
//             alert('Could not access microphone. Please check permissions.');
//         }
//     };

//     const stopRecording = () => {
//         if (mediaRecorder) {
//             mediaRecorder.stop();
//             setIsRecording(false);
//         }
//     };

//     // Transcribe audio using Supabase Edge Function
//     const transcribeAudio = async (audioBlob: Blob) => {
//         try {
//             setProcessing(true);
//             setError(null);

//             // Get session for auth
//             const { data: sessionData } = await supabase.auth.getSession();
//             const session = sessionData?.session;

//             // Create form data
//             const formData = new FormData();
//             formData.append('file', audioBlob, 'recording.webm');

//             // Attempt to call the Edge Function
//             const url = `${supabase.functions.url}/transcribe-audio`;

//             // Define headers
//             const headers: Record<string, string> = {};

//             // Add auth headers if session exists
//             if (session) {
//                 headers['Authorization'] = `Bearer ${session.access_token}`;
//                 headers['x-user-id'] = session.user.id;
//             }

//             const response = await fetch(url, {
//                 method: 'POST',
//                 headers,
//                 body: formData,
//                 credentials: 'omit'
//             });

//             if (!response.ok) {
//                 // Fallback to direct OpenAI API if edge function fails
//                 await fallbackTranscribeAudio(audioBlob);
//                 return;
//             }

//             const data = await response.json();

//             if (data.text) {
//                 setInputText(prevText => prevText + ' ' + data.text.trim());
//             } else {
//                 throw new Error('No transcription returned');
//             }

//         } catch (error: any) {
//             console.error('Error transcribing audio:', error);
//             setError(error instanceof Error ? error.message : 'Failed to transcribe audio');
//         } finally {
//             setProcessing(false);
//         }
//     };

//     // Fallback to direct OpenAI API if edge function fails
//     const fallbackTranscribeAudio = async (audioBlob: Blob) => {
//         try {
//             const formData = new FormData();
//             formData.append('file', audioBlob, 'recording.webm');
//             formData.append('model', 'whisper-1');

//             const response = await axios.post(
//                 'https://api.openai.com/v1/audio/transcriptions',
//                 formData,
//                 {
//                     headers: {
//                         'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
//                         'Content-Type': 'multipart/form-data'
//                     }
//                 }
//             );

//             if (response.data.text) {
//                 setInputText(prevText => prevText + ' ' + response.data.text.trim());
//             }
//         } catch (error: any) {
//             console.error('Error in fallback transcription:', error);
//             setError(error instanceof Error ? error.message : 'Failed to transcribe audio');
//         }
//     };

//     // Optimize inventory data for OpenAI prompt to reduce token usage
//     const optimizeInventoryForPrompt = (fullInventory: InventoryItem[]) => {
//         // Limit to most relevant items (e.g., 30 max)
//         return fullInventory.slice(0, 30).map(item =>
//             `- ${item.name} (Stock: ${item.quantity}, Unit Price: $${item.unit_price.toFixed(2)}, Min Price: $${item.min_price.toFixed(2)})`
//         ).join('\n');
//     };

//     // Create the prompt for OpenAI
//     const createPrompt = (input: string, inventoryData: InventoryItem[], vendorData: Vendor[]): string => {
//         // Format inventory data (optimized)
//         const inventoryText = optimizeInventoryForPrompt(inventoryData);

//         // Format vendor data (limit to 50 vendors max to save tokens)
//         const vendorText = vendorData.slice(0, 50).map(vendor => `- ${vendor.name}`).join('\n');

//         // Create the prompt using the template
//         return `You are a sales assistant helping a field salesperson extract actionable data from freeform sales notes.
// ---
// Below is the current inventory information:
// ${inventoryText}
// Each product includes:
// - Product Name
// - Inventory (available stock)
// - Unit Price
// - Minimum Price Threshold (the lowest allowed selling price)
// ---
// Below is the current customer list:
// ${vendorText}
// ---
// Now, interpret the following freeform sales note and extract structured data.
// ### Instructions:
// 1. **Identify**:
//    - Customer name
//    - Ordered items with:
//      - Product name
//      - Quantity
//      - Unit price
//      - Discount (if any)
//    - Any other information relevant to:
//      - A **Note** (e.g., delivery date, special instructions)
//      - A **Task** (e.g., follow-up, future reminder)
// 2. **Validate**:
//    - Ensure ordered quantity does not exceed available inventory
//    - Ensure unit price is not below the product's minimum threshold
//    - If either rule is violated, flag it clearly for the user
// 3. **Resolve Ambiguity**:
//    - If a product or customer name is unclear, make the best-guess match and annotate it for user confirmation
//    - Assume typos or similar names might still be intentional (e.g., "Wagu" → "Wagyu")
// 4. **Classify Output** into the following structured format:
//    - **Quote / Order**
//      - List of items with quantity, unit price, and discount
//      - Include validation warnings if any
//    - **Note**
//      - Any details like delivery date or internal comments
//    - **Task**
//      - Any follow-up reminders or actions to take
// ---
// ### Output Format (Strictly Follow)
// **Customer**: [Detected Customer]
// **Quote / Order**:
// | Product Name      | Quantity | Unit Price | Discount | Validation Status |
// |-------------------|----------|------------|----------|-------------------|
// |                   |          |            |          |                   |
// **Note**:
// > [Freeform notes extracted]
// **Task**:
// > [Action items or reminders extracted]
// **Ambiguities (if any)**:
// > [Clearly list any assumptions or uncertainties]
// ---
// Freeform Sales Note:
// ${input}`;
//     };

//     // Process the input with OpenAI API using the aiService
//     const processInput = async () => {
//         if (!inputText.trim()) return;

//         setProcessing(true);
//         setError(null);

//         try {
//             // Prepare optimized prompt
//             const prompt = createPrompt(inputText, inventory, vendors);

//             // Use the aiService instead of direct API calls
//             const response = await generateContent({
//                 prompt: prompt,
//                 contentType: 'sales-assistant',
//                 model: OPENAI_MODELS.GPT_3_5_TURBO
//             });

//             if (response.error) {
//                 throw new Error(response.error);
//             }

//             // Parse the response
//             const aiResponse = response.content;
//             const parsedData = parseAIResponse(aiResponse);

//             // Validate and match the extracted data
//             const validatedData = validateExtractedData(parsedData);

//             setExtractedData(validatedData);
//             setShowConfirmation(true);

//         } catch (error: any) {
//             console.error('Error processing input:', error);
//             setError(error instanceof Error ? error.message : 'Failed to process input');
//         } finally {
//             setProcessing(false);
//         }
//     };

//     // Parse the AI response
//     const parseAIResponse = (response: string): ExtractedData => {
//         // Initialize default structure
//         const defaultData: ExtractedData = {
//             customer: '',
//             quote_order: [],
//             note: '',
//             task: '',
//             ambiguities: ''
//         };

//         try {
//             // Extract customer
//             const customerMatch = response.match(/\*\*Customer\*\*:\s*(.+?)(?=\n\*\*|\n$)/s);
//             if (customerMatch && customerMatch[1]) {
//                 defaultData.customer = customerMatch[1].trim();
//             }

//             // Extract quote/order
//             const tableRows = response.split('\n').filter(row =>
//                 row.trim().startsWith('|') &&
//                 !row.includes('---|---') &&
//                 !row.includes('Product Name')
//             );

//             if (tableRows.length > 0) {
//                 defaultData.quote_order = tableRows.map(row => {
//                     const cells = row.split('|').filter(cell => cell.trim() !== '');
//                     if (cells.length >= 5) {
//                         return {
//                             product_name: cells[0].trim(),
//                             quantity: parseInt(cells[1].trim()) || 0,
//                             unit_price: parseFloat(cells[2].trim().replace('$', '')) || 0,
//                             discount: parseFloat(cells[3].trim().replace('%', '')) || 0,
//                             validation_status: cells[4].trim()
//                         };
//                     }
//                     return null;
//                 }).filter(Boolean) as OrderItem[];
//             }

//             // Extract note
//             const noteMatch = response.match(/\*\*Note\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
//             if (noteMatch && noteMatch[1]) {
//                 defaultData.note = noteMatch[1].trim();
//             }

//             // Extract task
//             const taskMatch = response.match(/\*\*Task\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
//             if (taskMatch && taskMatch[1]) {
//                 defaultData.task = taskMatch[1].trim();
//             }

//             // Extract ambiguities
//             const ambiguitiesMatch = response.match(/\*\*Ambiguities \(if any\)\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
//             if (ambiguitiesMatch && ambiguitiesMatch[1]) {
//                 defaultData.ambiguities = ambiguitiesMatch[1].trim();
//             }

//             return defaultData;
//         } catch (error) {
//             console.error('Error parsing AI response:', error);
//             return defaultData;
//         }
//     };

//     // Validate and match the extracted data
//     const validateExtractedData = (data: ExtractedData): ExtractedData => {
//         const validatedData = { ...data };

//         // Match customer name using fuzzy search
//         if (data.customer && vendors.length > 0) {
//             const fuseOptions = {
//                 keys: ['name'],
//                 threshold: 0.4 // Lower threshold means more strict matching
//             };

//             const fuse = new Fuse(vendors, fuseOptions);
//             const results = fuse.search(data.customer);

//             if (results.length > 0) {
//                 validatedData.customer = results[0].item.name;
//             }
//         }

//         // Validate and match products
//         if (data.quote_order && data.quote_order.length > 0) {
//             validatedData.quote_order = data.quote_order.map(item => {
//                 const matchedItem = findMatchingInventoryItem(item.product_name, inventory);

//                 // Create a new order item with validation
//                 const validatedItem: OrderItem = {
//                     ...item,
//                     validation_status: 'Valid'
//                 };

//                 if (matchedItem) {
//                     // Check quantity
//                     if (item.quantity > matchedItem.quantity) {
//                         validatedItem.validation_status = `Warning: Quantity exceeds available stock (${matchedItem.quantity})`;
//                     }

//                     // Check price
//                     if (item.unit_price < matchedItem.min_price) {
//                         validatedItem.validation_status = validatedItem.validation_status === 'Valid'
//                             ? `Warning: Price below minimum (${matchedItem.min_price})`
//                             : `${validatedItem.validation_status}, Price below minimum (${matchedItem.min_price})`;
//                     }

//                     // Calculate discount if not provided
//                     if (!item.discount && matchedItem.unit_price > 0) {
//                         const calculatedDiscount = Math.round(
//                             ((matchedItem.unit_price - item.unit_price) / matchedItem.unit_price) * 100
//                         );
//                         validatedItem.discount = calculatedDiscount > 0 ? calculatedDiscount : 0;
//                     }
//                 } else {
//                     validatedItem.validation_status = 'Warning: Product not found in inventory';
//                 }

//                 return validatedItem;
//             });
//         }

//         return validatedData;
//     };

//     // Find matching inventory item using fuzzy search
//     const findMatchingInventoryItem = (productName: string, inventoryItems: InventoryItem[]): InventoryItem | null => {
//         if (!productName || inventoryItems.length === 0) {
//             return null;
//         }

//         const fuseOptions = {
//             keys: ['name'],
//             threshold: 0.4
//         };

//         const fuse = new Fuse(inventoryItems, fuseOptions);
//         const results = fuse.search(productName);

//         return results.length > 0 ? results[0].item : null;
//     };

//     // Handle customer edit toggle
//     const toggleCustomerEdit = () => {
//         if (editingCustomer) {
//             // Save the edited customer name
//             if (extractedData) {
//                 setExtractedData({
//                     ...extractedData,
//                     customer: editedCustomer
//                 });
//             }
//         } else {
//             // Start editing and initialize with current value
//             setEditedCustomer(extractedData?.customer || '');
//         }

//         setEditingCustomer(!editingCustomer);
//     };

//     // Handle customer name change
//     const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setEditedCustomer(e.target.value);
//     };

//     // Handle order item edit
//     const handleOrderItemEdit = (index: number, field: keyof OrderItem, value: string | number) => {
//         if (!extractedData) return;

//         const updatedOrder = [...extractedData.quote_order];
//         updatedOrder[index] = {
//             ...updatedOrder[index],
//             [field]: typeof value === 'string' && field !== 'product_name' ? parseFloat(value as string) : value
//         };

//         // Re-validate the item
//         const item = updatedOrder[index];
//         const matchedInventory = findMatchingInventoryItem(item.product_name, inventory);

//         if (matchedInventory) {
//             let validationStatus = 'Valid';

//             if (item.quantity > matchedInventory.quantity) {
//                 validationStatus = `Warning: Quantity exceeds available stock (${matchedInventory.quantity})`;
//             }

//             if (item.unit_price < matchedInventory.min_price) {
//                 validationStatus = validationStatus === 'Valid'
//                     ? `Warning: Price below minimum (${matchedInventory.min_price})`
//                     : `${validationStatus}, Price below minimum (${matchedInventory.min_price})`;
//             }

//             updatedOrder[index].validation_status = validationStatus;
//         }

//         setExtractedData({
//             ...extractedData,
//             quote_order: updatedOrder
//         });
//     };

//     // Handle note edit
//     const handleNoteEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//         if (!extractedData) return;

//         setExtractedData({
//             ...extractedData,
//             note: e.target.value
//         });
//     };

//     // Handle task edit
//     const handleTaskEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//         if (!extractedData) return;

//         setExtractedData({
//             ...extractedData,
//             task: e.target.value
//         });
//     };

//     // Confirm the extracted data
//     const confirmData = () => {
//         setFinalData(extractedData);
//         setShowConfirmation(false);
//         // Save data to database
//         saveData();
//     };

//     // Cancel the confirmation
//     const cancelConfirmation = () => {
//         setShowConfirmation(false);
//         setExtractedData(null);
//     };

//     // Save the final data
//     const saveData = async () => {
//         if (!finalData) return;

//         try {
//             // Find matching vendor
//             const vendorMatch = vendors.find(v => v.name === finalData.customer);

//             if (finalData.quote_order.length > 0) {
//                 // Save order to database
//                 const { error } = await supabase
//                     .from('orders')
//                     .insert({
//                         vendor_id: vendorMatch?.id || null,
//                         organization_id: selectedOrganizationId,
//                         items: finalData.quote_order,
//                         notes: finalData.note,
//                         created_at: new Date().toISOString()
//                     });

//                 if (error) throw error;
//             }

//             if (finalData.task) {
//                 // Save task to database
//                 const { error } = await supabase
//                     .from('tasks')
//                     .insert({
//                         description: finalData.task,
//                         organization_id: selectedOrganizationId,
//                         vendor_id: vendorMatch?.id || null,
//                         created_at: new Date().toISOString()
//                     });

//                 if (error) throw error;
//             }

//             alert('Data saved successfully!');
//             setInputText('');
//             setFinalData(null);

//         } catch (error) {
//             console.error('Error saving data:', error);
//             alert('An error occurred while saving the data. Please try again.');
//         }
//     };

//     return (
//         <motion.div
//             initial={{ opacity: 0, y: 10 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="sales-assistant p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md"
//         >
//             <h1 className="text-2xl font-bold mb-4 text-gray-800">Sales Assistant</h1>

//             {/* Error Message */}
//             {error && (
//                 <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                     {error}
//                 </div>
//             )}

//             {/* Input Section */}
//             <div className="mb-6">
//                 <label className="block text-sm font-medium mb-2 text-gray-700">
//                     Enter your sales notes:
//                 </label>
//                 <div className="relative">
//                     <textarea
//                         className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
//                         value={inputText}
//                         onChange={handleInputChange}
//                         placeholder="Enter your notes about customer interaction here..."
//                         disabled={processing || !selectedOrganizationId}
//                     />
//                     <div className="absolute bottom-3 right-3 flex space-x-2">
//                         {isRecording ? (
//                             <motion.button
//                                 whileTap={{ scale: 0.95 }}
//                                 onClick={stopRecording}
//                                 className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none"
//                                 title="Stop recording"
//                             >
//                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                                     <rect x="6" y="6" width="8" height="8" />
//                                 </svg>
//                             </motion.button>
//                         ) : (
//                             <motion.button
//                                 whileTap={{ scale: 0.95 }}
//                                 onClick={startRecording}
//                                 className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 focus:outline-none"
//                                 title="Start recording"
//                                 disabled={processing || !selectedOrganizationId}
//                             >
//                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                                     <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
//                                 </svg>
//                             </motion.button>
//                         )}
//                     </div>
//                 </div>
//                 <motion.button
//                     whileTap={{ scale: 0.98 }}
//                     className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed transition duration-200 flex items-center"
//                     onClick={processInput}
//                     disabled={processing || !inputText.trim() || !selectedOrganizationId}
//                 >
//                     {processing ? (
//                         <>
//                             <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                             </svg>
//                             Processing...
//                         </>
//                     ) : (
//                         'Process Notes'
//                     )}
//                 </motion.button>
//             </div>

//             {/* Confirmation Dialog */}
//             {showConfirmation && extractedData && (
//                 <motion.div
//                     initial={{ opacity: 0 }}
//                     animate={{ opacity: 1 }}
//                     exit={{ opacity: 0 }}
//                     className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
//                 >
//                     <motion.div
//                         initial={{ scale: 0.95, opacity: 0 }}
//                         animate={{ scale: 1, opacity: 1 }}
//                         exit={{ scale: 0.95, opacity: 0 }}
//                         className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
//                     >
//                         <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Extracted Data</h2>

//                         {/* Restaurant/Customer Section */}
//                         <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//                             <div className="flex justify-between items-center">
//                                 <h3 className="font-semibold text-gray-700">Customer/Restaurant</h3>
//                                 <button
//                                     className="text-blue-600 hover:text-blue-800 font-medium text-sm"
//                                     onClick={toggleCustomerEdit}
//                                 >
//                                     {editingCustomer ? 'Save' : 'Edit'}
//                                 </button>
//                             </div>

//                             {editingCustomer ? (
//                                 <input
//                                     type="text"
//                                     className="mt-2 w-full p-2 border border-gray-300 rounded-md"
//                                     value={editedCustomer}
//                                     onChange={handleCustomerChange}
//                                 />
//                             ) : (
//                                 <p className="mt-2 text-gray-900 font-medium">{extractedData.customer || 'Not detected'}</p>
//                             )}
//                         </div>

//                         {/* Quote/Order Section */}
//                         <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//                             <h3 className="font-semibold mb-3 text-gray-700">Quote / Order</h3>

//                             {extractedData.quote_order.length > 0 ? (
//                                 <div className="overflow-x-auto">
//                                     <table className="min-w-full divide-y divide-gray-200">
//                                         <thead className="bg-gray-100">
//                                             <tr>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
//                                                 <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody className="bg-white divide-y divide-gray-200">
//                                             {extractedData.quote_order.map((item, index) => (
//                                                 <tr key={index} className={item.validation_status !== 'Valid' ? 'bg-yellow-50' : ''}>
//                                                     <td className="py-2 px-3">
//                                                         <input
//                                                             type="text"
//                                                             className="w-full p-1 border rounded"
//                                                             value={item.product_name}
//                                                             onChange={(e) => handleOrderItemEdit(index, 'product_name', e.target.value)}
//                                                         />
//                                                     </td>
//                                                     <td className="py-2 px-3">
//                                                         <input
//                                                             type="number"
//                                                             className="w-full p-1 border rounded"
//                                                             value={item.quantity}
//                                                             onChange={(e) => handleOrderItemEdit(index, 'quantity', parseInt(e.target.value) || 0)}
//                                                         />
//                                                     </td>
//                                                     <td className="py-2 px-3">
//                                                         <input
//                                                             type="number"
//                                                             step="0.01"
//                                                             className="w-full p-1 border rounded"
//                                                             value={item.unit_price}
//                                                             onChange={(e) => handleOrderItemEdit(index, 'unit_price', parseFloat(e.target.value) || 0)}
//                                                         />
//                                                     </td>
//                                                     <td className="py-2 px-3">
//                                                         <div className="flex items-center">
//                                                             <input
//                                                                 type="number"
//                                                                 className="w-16 p-1 border rounded"
//                                                                 value={item.discount}
//                                                                 onChange={(e) => handleOrderItemEdit(index, 'discount', parseInt(e.target.value) || 0)}
//                                                             />
//                                                             <span className="ml-1">%</span>
//                                                         </div>
//                                                     </td>
//                                                     <td className={`py-2 px-3 text-sm ${item.validation_status !== 'Valid' ? 'text-red-600' : 'text-green-600'}`}>
//                                                         {item.validation_status}
//                                                     </td>
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             ) : (
//                                 <p className="text-gray-500 italic">No order items detected</p>
//                             )}
//                         </div>

//                         {/* Task Section */}
//                         <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//                             <h3 className="font-semibold mb-2 text-gray-700">Task</h3>
//                             <textarea
//                                 className="w-full p-2 border border-gray-300 rounded-md"
//                                 value={extractedData.task}
//                                 onChange={handleTaskEdit}
//                                 rows={2}
//                                 placeholder="No tasks detected"
//                             />
//                         </div>

//                         {/* Notes Section */}
//                         <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//                             <h3 className="font-semibold mb-2 text-gray-700">Notes</h3>
//                             <textarea
//                                 className="w-full p-2 border border-gray-300 rounded-md"
//                                 value={extractedData.note}
//                                 onChange={handleNoteEdit}
//                                 rows={3}
//                                 placeholder="No notes detected"
//                             />
//                         </div>

//                         {/* Ambiguities Section */}
//                         {extractedData.ambiguities && (
//                             <div className="mb-4 p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
//                                 <h3 className="font-semibold mb-2 text-yellow-800">Ambiguities</h3>
//                                 <p className="text-yellow-700">{extractedData.ambiguities}</p>
//                             </div>
//                         )}

//                         {/* Action Buttons */}
//                         <div className="flex justify-end gap-3 mt-6">
//                             <motion.button
//                                 whileTap={{ scale: 0.97 }}
//                                 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition duration-200"
//                                 onClick={cancelConfirmation}
//                             >
//                                 Cancel
//                             </motion.button>
//                             <motion.button
//                                 whileTap={{ scale: 0.97 }}
//                                 className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition duration-200"
//                                 onClick={confirmData}
//                             >
//                                 Confirm & Save
//                             </motion.button>
//                         </div>
//                     </motion.div>
//                 </motion.div>
//             )}

//             {/* Success Message */}
//             {finalData && (
//                 <div className="mt-6 p-4 border border-green-200 rounded-lg bg-green-50">
//                     <div className="flex items-center">
//                         <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                         </svg>
//                         <h2 className="text-lg font-semibold text-green-800">Data Saved Successfully!</h2>
//                     </div>
//                     <ul className="mt-2 text-green-700">
//                         <li>Customer: {finalData.customer}</li>
//                         <li>Items: {finalData.quote_order.length}</li>
//                         {finalData.task && <li>Task created: {finalData.task}</li>}
//                     </ul>
//                 </div>
//             )}
//         </motion.div>
//     );
// };

// // Exporting a wrapper component that ensures the OrganizationContext is available
// export default function SalesAssistantWrapper() {
//     const { selectedOrganization } = useOrganization();

//     // If no organization is selected, show a message
//     if (!selectedOrganization) {
//         return (
//             <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
//                 <h1 className="text-2xl font-bold mb-4 text-gray-800">Sales Assistant</h1>
//                 <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg flex items-center">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                     Please select an organization to use the Sales Assistant
//                 </div>
//             </div>
//         );
//     }

//     return <SalesAssistant />;
// }



//v4
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
    Mic,
    MicOff,
    Sparkles,
    AlertCircle,
    CheckCircle,
    XCircle,
    Edit,
    Bug
} from 'lucide-react';


// TypeScript interfaces
interface Vendor {
    id: string;
    name: string;
    organization_id: string;
}

interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    min_price: number;
    max_price: number;
    location: string;
    organization_id: string;
}

interface OrderItem {
    product_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    validation_status: string;
}

interface ExtractedData {
    customer: string;
    quote_order: OrderItem[];
    note: string;
    task: string;
    ambiguities: string;
    rawResponse?: string; // Added for debugging
}

// Create SalesAssistant component
const SalesAssistant: React.FC = () => {
    // Organization context
    const { selectedOrganization } = useOrganization();
    const selectedOrganizationId = selectedOrganization?.id;

    // State variables
    const [inputText, setInputText] = useState<string>('');
    const [processing, setProcessing] = useState<boolean>(false);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [finalData, setFinalData] = useState<ExtractedData | null>(null);
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const [editingCustomer, setEditingCustomer] = useState<boolean>(false);
    const [editedCustomer, setEditedCustomer] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState<boolean>(false);

    // OpenAI API Key
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';

    // Fetch vendors and inventory when component mounts or organization changes
    useEffect(() => {
        if (selectedOrganizationId) {
            fetchVendors();
            fetchInventory();
        }
    }, [selectedOrganizationId]);

    // Show error message if no organization is selected
    useEffect(() => {
        if (!selectedOrganizationId) {
            setError('Please select an organization to use the Sales Assistant');
        } else {
            setError(null);
        }

        // Check if OpenAI API key is configured
        if (!openaiApiKey) {
            setError('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
        }
    }, [selectedOrganizationId, openaiApiKey]);

    // Fetch vendors from Supabase
    const fetchVendors = async () => {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('id, name, organization_id')
                .eq('organization_id', selectedOrganizationId);

            if (error) throw error;
            setVendors(data || []);
            console.log('Fetched vendors:', data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
        }
    };

    // Fetch inventory from Supabase
    const fetchInventory = async () => {
        try {
            const { data, error } = await supabase
                .from('temp_inventory')
                .select('*')
                .eq('organization_id', selectedOrganizationId);

            if (error) throw error;
            setInventory(data || []);
            console.log('Fetched inventory:', data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
    };

    // Voice recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => {
                chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                await transcribeAudio(audioBlob);
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            setError('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    // Transcribe audio directly with OpenAI API
    const transcribeAudio = async (audioBlob: Blob) => {
        try {
            setProcessing(true);
            setError(null);

            if (!openaiApiKey) {
                throw new Error('OpenAI API key is not configured');
            }

            // Directly use OpenAI API
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', 'whisper-1');

            const response = await axios.post(
                'https://api.openai.com/v1/audio/transcriptions',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${openaiApiKey}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data?.text) {
                setInputText(prevText => prevText + ' ' + response.data.text.trim());
            } else {
                throw new Error('No transcription returned');
            }
        } catch (error: any) {
            console.error('Error transcribing audio:', error);
            setError(error instanceof Error ? error.message : 'Failed to transcribe audio');
        } finally {
            setProcessing(false);
        }
    };

    // Optimize inventory data for OpenAI prompt to reduce token usage
    const optimizeInventoryForPrompt = (fullInventory: InventoryItem[]) => {
        // Limit to most relevant items (e.g., 30 max)
        return fullInventory.slice(0, 30).map(item =>
            `- ${item.name} (Stock: ${item.quantity}, Unit Price: $${item.unit_price.toFixed(2)}, Min Price: $${item.min_price.toFixed(2)})`
        ).join('\n');
    };

    // Create the prompt for OpenAI
    const createPrompt = (input: string, inventoryData: InventoryItem[], vendorData: Vendor[]): string => {
        // Format inventory data (optimized)
        const inventoryText = optimizeInventoryForPrompt(inventoryData);

        // Format vendor data (limit to 50 vendors max to save tokens)
        const vendorText = vendorData.slice(0, 50).map(vendor => `- ${vendor.name}`).join('\n');

        // Create the prompt using the template
        return `You are a sales assistant helping a field salesperson extract actionable data from freeform sales notes.
---
Below is the current inventory information:
${inventoryText}
Each product includes:
- Product Name
- Inventory (available stock)
- Unit Price (inventory standard price, not what we should use for customer orders)
- Minimum Price Threshold (the lowest allowed selling price)
---
Below is the current customer list:
${vendorText}
---
Now, interpret the following freeform sales note and extract structured data.
### Instructions:
1. **Identify**:
   - Customer name (must be exactly as it appears in the sales note)
   - Ordered items with:
     - Product name (must be exactly as it appears in the sales note)
     - Quantity (must be exactly as it appears in the sales note)
     - Unit price (IMPORTANT: Use the EXACT price from the input, NOT from the inventory)
     - Discount (if any)
   - Any other information relevant to:
     - A **Note** (e.g., delivery date, special instructions)
     - A **Task** (e.g., follow-up, future reminder)
2. **Validate**:
   - Do NOT modify the unit prices provided in the input
   - Use the customer's price exactly as entered in the notes
   - Preserve exactly what the user entered
3. **Resolve Ambiguity**:
   - If a product or customer name is unclear, make the best-guess match and annotate it for user confirmation
   - IMPORTANT: Always preserve the EXACT text as it appears in the input for prices, quantities and names
4. **Classify Output** into the following structured format:
   - **Quote / Order**
     - List of items with quantity, unit price exactly as entered in the input
   - **Note**
     - Any details like delivery date or internal comments
   - **Task**
     - Any follow-up reminders or actions to take
---
### Output Format (Strictly Follow)
**Customer**: [Detected Customer]
**Quote / Order**:
| Product Name      | Quantity | Unit Price | Discount | Validation Status |
|-------------------|----------|------------|----------|-------------------|
|                   |          |            |          |                   |
**Note**:
> [Freeform notes extracted]
**Task**:
> [Action items or reminders extracted]
**Ambiguities (if any)**:
> [Clearly list any assumptions or uncertainties]
---
Freeform Sales Note:
${input}`;
    };

    // Process the input directly with OpenAI API
    const processInput = async () => {
        if (!inputText.trim()) return;

        setProcessing(true);
        setError(null);

        try {
            // Check if OpenAI API key is configured
            if (!openaiApiKey) {
                throw new Error('OpenAI API key is not configured');
            }

            // Prepare optimized prompt
            const prompt = createPrompt(inputText, inventory, vendors);

            // Call OpenAI API directly
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: prompt }
                    ],
                    temperature: 0.1, // Lower temperature for more consistent and exact results
                    max_tokens: 1000, // Set limit to control token usage
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiApiKey}`
                    }
                }
            );

            // Parse the response
            const aiResponse = response.data.choices[0].message.content;
            console.log('Raw AI response:', aiResponse);

            const parsedData = parseAIResponse(aiResponse);

            // Add raw response for debugging
            parsedData.rawResponse = aiResponse;

            // Validate and match the extracted data
            const validatedData = validateExtractedData(parsedData, inputText);

            setExtractedData(validatedData);
            setShowConfirmation(true);

        } catch (error: any) {
            console.error('Error processing input:', error);
            setError(error instanceof Error ? error.message : 'Failed to process input');
        } finally {
            setProcessing(false);
        }
    };

    // Parse the AI response
    const parseAIResponse = (response: string): ExtractedData => {
        console.log('Starting to parse AI response');

        // Initialize default structure
        const defaultData: ExtractedData = {
            customer: '',
            quote_order: [],
            note: '',
            task: '',
            ambiguities: ''
        };

        try {
            // Extract customer
            const customerMatch = response.match(/\*\*Customer\*\*:\s*(.+?)(?=\n\*\*|\n$)/s);
            if (customerMatch && customerMatch[1]) {
                defaultData.customer = customerMatch[1].trim();
                console.log('Extracted customer:', defaultData.customer);
            }

            // Extract quote/order
            // First get all lines between Quote / Order header and the next section
            const orderSection = response.match(/\*\*Quote \/ Order\*\*:[\s\S]*?(?=\*\*Note\*\*:|\*\*Task\*\*:|\*\*Ambiguities)/);

            if (orderSection && orderSection[0]) {
                // Get all table rows - lines starting with | that aren't the header or separator
                const tableRows = orderSection[0].split('\n').filter(row =>
                    row.trim().startsWith('|') &&
                    !row.includes('---|---') &&
                    !row.includes('Product Name')
                );

                console.log('Found table rows:', tableRows);

                if (tableRows.length > 0) {
                    const parsedItems = [];

                    for (const row of tableRows) {
                        const cells = row.split('|').filter(cell => cell.trim() !== '');
                        console.log('Cells in row:', cells);

                        // We need at least a product name, quantity, and price
                        if (cells.length >= 3) {
                            const productName = cells[0].trim();
                            const quantity = parseInt(cells[1].trim()) || 0;
                            const unitPrice = parseFloat(cells[2].trim().replace(/[$,]/g, '')) || 0;

                            // Discount might be empty
                            const discountCell = cells.length > 3 ? cells[3].trim() : '';
                            const discount = parseFloat(discountCell.replace(/[%,]/g, '')) || 0;

                            // Status might be in different positions depending on the discount
                            const statusCell = cells.length > 4 ? cells[4].trim() : (cells.length > 3 && discountCell === '' ? cells[3].trim() : 'Valid');
                            const status = statusCell === 'OK' ? 'Valid' : statusCell;

                            console.log(`Creating order item: ${productName}, ${quantity}, ${unitPrice}, ${discount}, ${status}`);

                            // Create the order item
                            const orderItem = {
                                product_name: productName,
                                quantity: quantity,
                                unit_price: unitPrice,
                                discount: discount,
                                validation_status: status || 'Valid'
                            };

                            parsedItems.push(orderItem);
                        }
                    }

                    // Set the parsed items
                    defaultData.quote_order = parsedItems;
                    console.log('Final parsed order items:', defaultData.quote_order);
                }
            }

            // Extract note
            const noteMatch = response.match(/\*\*Note\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
            if (noteMatch && noteMatch[1]) {
                defaultData.note = noteMatch[1].trim();
                console.log('Extracted note:', defaultData.note);
            }

            // Extract task
            const taskMatch = response.match(/\*\*Task\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
            if (taskMatch && taskMatch[1]) {
                defaultData.task = taskMatch[1].trim();
                console.log('Extracted task:', defaultData.task);
            }

            // Extract ambiguities
            const ambiguitiesMatch = response.match(/\*\*Ambiguities \(if any\)\*\*:\s*\n>(.*?)(?=\n\*\*|\n$)/s);
            if (ambiguitiesMatch && ambiguitiesMatch[1]) {
                defaultData.ambiguities = ambiguitiesMatch[1].trim();
                console.log('Extracted ambiguities:', defaultData.ambiguities);
            }

            return defaultData;
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return defaultData;
        }
    };

    // Extract potential entities from the input text
    const extractEntitiesFromInput = (input: string) => {
        // Split by common separators and newlines
        const lines = input.split(/[\n,;]+/);

        // First line is often the customer/restaurant name
        const potentialCustomer = lines[0]?.trim();

        // Potential products are lines that mention products or have numbers and dollar signs
        const potentialProducts = lines.filter(line => {
            const hasNumbers = /\d+/.test(line);
            const hasDollarSign = line.includes('$') || /\$\d+/.test(line);
            const hasProductKeyword = /product|item|order|qty|quantity|price|each|pcs|pieces|unit/i.test(line);

            // Accept lines that look like product entries
            return (hasNumbers && hasDollarSign) ||
                (hasNumbers && hasProductKeyword) ||
                (line.toUpperCase() === line && line.split(' ').length <= 4 && hasNumbers); // ALL CAPS short product names
        });

        console.log('Potential products from input:', potentialProducts);

        // Extract tasks (lines with dates or words like "check", "follow up", etc.)
        const potentialTasks = lines.filter(line =>
            (line.includes('by') && /\d+\/\d+/.test(line)) || // Has "by" and a date
            /check|follow|call|contact|remind|schedule/i.test(line) // Has task-related words
        );

        // Extract notes (everything else that isn't a product or task)
        const potentialNotes = lines.filter(line =>
            line.trim() !== potentialCustomer &&
            !potentialProducts.includes(line) &&
            !potentialTasks.includes(line) &&
            line.trim() !== ''
        );

        return {
            potentialCustomer,
            potentialProducts,
            potentialTasks,
            potentialNotes
        };
    };

    const extractProductsManually = (input: string, inventory: InventoryItem[]): OrderItem[] => {
        console.log('Attempting manual product extraction');
        const extractedItems: OrderItem[] = [];

        // Split input by lines
        const lines = input.split('\n');

        for (const line of lines) {
            // Look for patterns like "PRODUCT_NAME, 30, $30" or "PRODUCT_NAME 30 $30"
            const commaPattern = /([A-Za-z\s]+)\s*,\s*(\d+)\s*,\s*\$?(\d+(?:\.\d+)?)/;
            const spacePattern = /([A-Za-z\s]+)\s+(\d+)\s+\$?(\d+(?:\.\d+)?)/;

            let match = line.match(commaPattern) || line.match(spacePattern);

            if (match) {
                const [_, productName, quantity, price] = match;

                // Try to find the product in inventory
                const matchedProduct = inventory.find(item =>
                    item.name.toLowerCase() === productName.trim().toLowerCase()
                );

                const orderItem: OrderItem = {
                    product_name: matchedProduct ? matchedProduct.name : productName.trim(),
                    quantity: parseInt(quantity),
                    unit_price: parseFloat(price),
                    discount: 0,
                    validation_status: matchedProduct ? 'Valid' : 'Warning: Product not found in inventory'
                };

                extractedItems.push(orderItem);
                console.log('Manually extracted item:', orderItem);
            }
        }

        return extractedItems;
    };

    // Validate and match the extracted data - improved to prioritize exact matches
    const validateExtractedData = (data: ExtractedData, originalInput: string): ExtractedData => {
        console.log('Starting validation with extracted data:', data);

        // If we have no order items at this point, try direct extraction
        if (!data.quote_order || data.quote_order.length === 0) {
            console.log('No order items found in AI response, trying direct extraction');
            const manuallyExtractedItems = extractProductsManually(originalInput, inventory);

            if (manuallyExtractedItems.length > 0) {
                data.quote_order = manuallyExtractedItems;
                console.log('Using manually extracted items:', data.quote_order);
            }
        }
        const validatedData = { ...data };

        // Extract customer and product candidates from input text to help with validation
        const extractedEntities = extractEntitiesFromInput(originalInput);
        console.log('Extracted entities from input:', extractedEntities);

        // Match customer name - FIRST try exact match, then fuzzy match if needed
        if (data.customer) {
            // Look for exact match first (case insensitive)
            const exactMatch = vendors.find(v =>
                v.name.toLowerCase() === data.customer.toLowerCase()
            );

            if (exactMatch) {
                validatedData.customer = exactMatch.name;
                console.log('Found exact vendor match:', exactMatch.name);
            } else {
                // Fallback to fuzzy search
                const fuseOptions = {
                    keys: ['name'],
                    threshold: 0.3 // Lower threshold for stricter matching
                };

                const fuse = new Fuse(vendors, fuseOptions);
                const results = fuse.search(data.customer);

                if (results.length > 0) {
                    console.log('Found fuzzy vendor match:', results[0].item.name, 'for input:', data.customer);
                    validatedData.customer = results[0].item.name;
                } else {
                    // Try matching against our extracted entities
                    if (extractedEntities.potentialCustomer) {
                        const exactCustomerMatch = vendors.find(v =>
                            v.name.toLowerCase() === extractedEntities.potentialCustomer.toLowerCase()
                        );

                        if (exactCustomerMatch) {
                            console.log('Found vendor match from extracted entities:', exactCustomerMatch.name);
                            validatedData.customer = exactCustomerMatch.name;
                        }
                    }
                }
            }
        }

        

        // Validate order items if we have any
        if (data.quote_order && data.quote_order.length > 0) {
            validatedData.quote_order = data.quote_order.map(item => {
                // Try exact match first for product name
                const exactMatch = inventory.find(
                    inv => inv.name.toLowerCase() === item.product_name.toLowerCase()
                );

                let matchedItem = exactMatch || findMatchingInventoryItem(item.product_name, inventory);

                // Create a new order item with validation
                const validatedItem: OrderItem = {
                    ...item,
                    validation_status: 'Valid'
                };

                if (matchedItem) {
                    // Update the product name to the matched inventory item name
                    validatedItem.product_name = matchedItem.name;

                    // Check quantity
                    if (item.quantity > matchedItem.quantity) {
                        validatedItem.validation_status = `Warning: Quantity exceeds available stock (${matchedItem.quantity})`;
                    }

                    // Check price
                    if (item.unit_price < matchedItem.min_price) {
                        validatedItem.validation_status = validatedItem.validation_status === 'Valid'
                            ? `Warning: Price below minimum (${matchedItem.min_price})`
                            : `${validatedItem.validation_status}, Price below minimum (${matchedItem.min_price})`;
                    }

                    // Calculate discount if not provided
                    if (!item.discount && matchedItem.unit_price > 0) {
                        const calculatedDiscount = Math.round(
                            ((matchedItem.unit_price - item.unit_price) / matchedItem.unit_price) * 100
                        );
                        validatedItem.discount = calculatedDiscount > 0 ? calculatedDiscount : 0;
                    }
                } else {
                    validatedItem.validation_status = 'Warning: Product not found in inventory';

                    // Look for this product in our extracted entities
                    const productLine = extractedEntities.potentialProducts.find(line =>
                        line.toLowerCase().includes(item.product_name.toLowerCase())
                    );

                    if (productLine) {
                        console.log('Found potential product match in input:', productLine);

                        // Extract quantity and price from the line
                        const qtyMatch = productLine.match(/\b(\d+)\b/);
                        const priceMatch = productLine.match(/\$\s*(\d+(?:\.\d+)?)/);

                        if (qtyMatch) validatedItem.quantity = parseInt(qtyMatch[1]);
                        if (priceMatch) validatedItem.unit_price = parseFloat(priceMatch[1]);
                    }
                }

                return validatedItem;
            });
        } else if (data.quote_order.length === 0 && extractedEntities.potentialProducts.length > 0) {
            // AI failed to extract products, but we have potential products in the input
            // Let's try to create order items from these potential products
            console.log('AI failed to extract products, trying manual extraction');

            const manuallyExtractedItems: OrderItem[] = [];

            for (const productLine of extractedEntities.potentialProducts) {
                // Try to extract product name, quantity, and price
                const parts = productLine.split(',').map(p => p.trim());

                if (parts.length >= 2) {
                    const productName = parts[0];
                    const quantityMatch = parts[1].match(/\b(\d+)\b/);
                    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 0;

                    // Look for price in the line
                    const priceMatch = productLine.match(/\$\s*(\d+(?:\.\d+)?)/);
                    const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

                    if (productName && quantity && price) {
                        // Try to match with inventory
                        const exactMatch = inventory.find(
                            inv => inv.name.toLowerCase() === productName.toLowerCase()
                        );

                        const matchedItem = exactMatch || findMatchingInventoryItem(productName, inventory);

                        const orderItem: OrderItem = {
                            product_name: productName,
                            quantity: quantity,
                            unit_price: price,
                            discount: 0,
                            validation_status: matchedItem ? 'Valid' : 'Warning: Product not found in inventory'
                        };

                        manuallyExtractedItems.push(orderItem);
                    }
                }
            }

            if (manuallyExtractedItems.length > 0) {
                validatedData.quote_order = manuallyExtractedItems;
                console.log('Manually extracted order items:', manuallyExtractedItems);
            }
        }

        // If AI failed to extract a customer but we have a potential one from the input
        if (!validatedData.customer && extractedEntities.potentialCustomer) {
            // Try exact match first
            const exactMatch = vendors.find(v =>
                v.name.toLowerCase() === extractedEntities.potentialCustomer.toLowerCase()
            );

            if (exactMatch) {
                validatedData.customer = exactMatch.name;
                console.log('Using extracted customer:', exactMatch.name);
            } else {
                // Try fuzzy match
                const fuseOptions = {
                    keys: ['name'],
                    threshold: 0.3
                };

                const fuse = new Fuse(vendors, fuseOptions);
                const results = fuse.search(extractedEntities.potentialCustomer);

                if (results.length > 0) {
                    validatedData.customer = results[0].item.name;
                    console.log('Using fuzzy-matched customer:', results[0].item.name);
                } else {
                    // Just use the extracted customer name as is
                    validatedData.customer = extractedEntities.potentialCustomer;
                }
            }
        }

        return validatedData;
    };

    // Find matching inventory item using fuzzy search
    const findMatchingInventoryItem = (productName: string, inventoryItems: InventoryItem[]): InventoryItem | null => {
        if (!productName || inventoryItems.length === 0) {
            return null;
        }

        // Try an exact match first (case insensitive)
        const exactMatch = inventoryItems.find(
            item => item.name.toLowerCase() === productName.toLowerCase()
        );

        if (exactMatch) {
            return exactMatch;
        }

        // If no exact match, use fuzzy search
        const fuseOptions = {
            keys: ['name'],
            threshold: 0.3 // Lower threshold for stricter matching
        };

        const fuse = new Fuse(inventoryItems, fuseOptions);
        const results = fuse.search(productName);

        return results.length > 0 ? results[0].item : null;
    };

    // Toggle debug mode
    const toggleDebug = () => {
        setShowDebug(!showDebug);
    };

    // Handle customer edit toggle
    const toggleCustomerEdit = () => {
        if (editingCustomer) {
            // Save the edited customer name
            if (extractedData) {
                setExtractedData({
                    ...extractedData,
                    customer: editedCustomer
                });
            }
        } else {
            // Start editing and initialize with current value
            setEditedCustomer(extractedData?.customer || '');
        }

        setEditingCustomer(!editingCustomer);
    };

    // Handle customer name change
    const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedCustomer(e.target.value);
    };

    // Handle order item edit
    const handleOrderItemEdit = (index: number, field: keyof OrderItem, value: string | number) => {
        if (!extractedData) return;

        const updatedOrder = [...extractedData.quote_order];
        updatedOrder[index] = {
            ...updatedOrder[index],
            [field]: typeof value === 'string' && field !== 'product_name' ? parseFloat(value as string) : value
        };

        // Re-validate the item
        const item = updatedOrder[index];
        const matchedInventory = findMatchingInventoryItem(item.product_name, inventory);

        if (matchedInventory) {
            let validationStatus = 'Valid';

            if (item.quantity > matchedInventory.quantity) {
                validationStatus = `Warning: Quantity exceeds available stock (${matchedInventory.quantity})`;
            }

            if (item.unit_price < matchedInventory.min_price) {
                validationStatus = validationStatus === 'Valid'
                    ? `Warning: Price below minimum (${matchedInventory.min_price})`
                    : `${validationStatus}, Price below minimum (${matchedInventory.min_price})`;
            }

            updatedOrder[index].validation_status = validationStatus;
        }

        setExtractedData({
            ...extractedData,
            quote_order: updatedOrder
        });
    };

    // Add new order item
    const addOrderItem = () => {
        if (!extractedData) return;

        const newItem: OrderItem = {
            product_name: '',
            quantity: 0,
            unit_price: 0,
            discount: 0,
            validation_status: 'New item'
        };

        setExtractedData({
            ...extractedData,
            quote_order: [...extractedData.quote_order, newItem]
        });
    };

    // Remove order item
    const removeOrderItem = (index: number) => {
        if (!extractedData) return;

        const updatedOrder = [...extractedData.quote_order];
        updatedOrder.splice(index, 1);

        setExtractedData({
            ...extractedData,
            quote_order: updatedOrder
        });
    };

    // Handle note edit
    const handleNoteEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!extractedData) return;

        setExtractedData({
            ...extractedData,
            note: e.target.value
        });
    };

    // Handle task edit
    const handleTaskEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!extractedData) return;

        setExtractedData({
            ...extractedData,
            task: e.target.value
        });
    };

    // Confirm the extracted data
    const confirmData = () => {
        setFinalData(extractedData);
        setShowConfirmation(false);
        // Save data to database
        saveData();
    };

    // Cancel the confirmation
    const cancelConfirmation = () => {
        setShowConfirmation(false);
        setExtractedData(null);
    };

    // Save the final data
    const saveData = async () => {
        if (!finalData) return;

        try {
            // Find matching vendor
            const vendorMatch = vendors.find(v => v.name === finalData.customer);

            if (finalData.quote_order.length > 0) {
                // Save order to database
                const { error } = await supabase
                    .from('orders')
                    .insert({
                        vendor_id: vendorMatch?.id || null,
                        organization_id: selectedOrganizationId,
                        items: finalData.quote_order,
                        notes: finalData.note,
                        created_at: new Date().toISOString()
                    });

                if (error) throw error;
            }

            if (finalData.task) {
                // Save task to database
                const { error } = await supabase
                    .from('tasks')
                    .insert({
                        description: finalData.task,
                        organization_id: selectedOrganizationId,
                        vendor_id: vendorMatch?.id || null,
                        created_at: new Date().toISOString()
                    });

                if (error) throw error;
            }

            setError(null);
            setInputText('');
            setFinalData(null);

        } catch (error: any) {
            console.error('Error saving data:', error);
            setError(error instanceof Error ? error.message : 'Failed to save data');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sales-assistant p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md"
        >
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Sales Assistant</h1>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleDebug}
                    className="text-gray-500 flex items-center text-sm"
                    title="Toggle debug mode"
                >
                    <Bug className="h-4 w-4 mr-1" />
                    {showDebug ? 'Hide Debug' : 'Debug Mode'}
                </motion.button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Input Section */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                    Enter your sales notes:
                </label>
                <div className="relative">
                    <textarea
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder="Enter your notes about customer interaction here..."
                        disabled={processing || !selectedOrganizationId}
                    />
                    <div className="absolute bottom-3 right-3 flex space-x-2">
                        {isRecording ? (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={stopRecording}
                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none"
                                title="Stop recording"
                            >
                                <MicOff className="h-5 w-5" />
                            </motion.button>
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={startRecording}
                                className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 focus:outline-none"
                                title="Start recording"
                                disabled={processing || !selectedOrganizationId}
                            >
                                <Mic className="h-5 w-5" />
                            </motion.button>
                        )}
                    </div>
                </div>
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-yellow-600 to-violet-600 text-white rounded-md hover:from-yellow-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center"
                    onClick={processInput}
                    disabled={processing || !inputText.trim() || !selectedOrganizationId}
                >
                    {processing ? (
                        <>
                            <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Process Notes
                        </>
                    )}
                </motion.button>
            </div>

            {/* Debug Info */}
            {showDebug && extractedData && (
                <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-2 text-gray-700">Debug Information</h3>
                    <div className="text-xs font-mono bg-black text-green-400 p-3 rounded-md overflow-auto max-h-40">
                        <pre>{JSON.stringify({
                            originalInput: inputText,
                            extractedData,
                            vendors: vendors.map(v => v.name),
                            inventory: inventory.map(i => i.name)
                        }, null, 2)}</pre>
                    </div>

                    {extractedData.rawResponse && (
                        <div className="mt-3">
                            <h4 className="text-sm font-semibold text-gray-700">Raw AI Response:</h4>
                            <div className="text-xs font-mono bg-black text-green-400 p-3 rounded-md overflow-auto max-h-40 mt-1">
                                <pre>{extractedData.rawResponse}</pre>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirmation && extractedData && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
                    >
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Extracted Data</h2>

                        {/* Restaurant/Customer Section */}
                        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700">Customer/Restaurant</h3>
                                <button
                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                    onClick={toggleCustomerEdit}
                                >
                                    {editingCustomer ? 'Save' : 'Edit'}
                                </button>
                            </div>

                            {editingCustomer ? (
                                <input
                                    type="text"
                                    className="mt-2 w-full p-2 border border-gray-300 rounded-md"
                                    value={editedCustomer}
                                    onChange={handleCustomerChange}
                                />
                            ) : (
                                <p className="mt-2 text-gray-900 font-medium">{extractedData.customer || 'Not detected'}</p>
                            )}
                        </div>

                        {/* Quote/Order Section */}
                        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-gray-700">Quote / Order</h3>
                                <button
                                    onClick={addOrderItem}
                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                                >
                                    <span className="mr-1">+</span> Add Item
                                </button>
                            </div>

                            {extractedData.quote_order.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                                <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                                <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                                <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                                                <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="py-3 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {extractedData.quote_order.map((item, index) => (
                                                <tr key={index} className={item.validation_status !== 'Valid' ? 'bg-yellow-50' : ''}>
                                                    <td className="py-2 px-3">
                                                        <input
                                                            type="text"
                                                            className="w-full p-1 border rounded"
                                                            value={item.product_name}
                                                            onChange={(e) => handleOrderItemEdit(index, 'product_name', e.target.value)}
                                                            list="product-options"
                                                        />
                                                        <datalist id="product-options">
                                                            {inventory.map((invItem) => (
                                                                <option key={invItem.id} value={invItem.name} />
                                                            ))}
                                                        </datalist>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <input
                                                            type="number"
                                                            className="w-full p-1 border rounded"
                                                            value={item.quantity}
                                                            onChange={(e) => handleOrderItemEdit(index, 'quantity', parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-full p-1 border rounded"
                                                            value={item.unit_price}
                                                            onChange={(e) => handleOrderItemEdit(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="flex items-center">
                                                            <input
                                                                type="number"
                                                                className="w-16 p-1 border rounded"
                                                                value={item.discount}
                                                                onChange={(e) => handleOrderItemEdit(index, 'discount', parseInt(e.target.value) || 0)}
                                                            />
                                                            <span className="ml-1">%</span>
                                                        </div>
                                                    </td>
                                                    <td className={`py-2 px-3 text-sm ${item.validation_status !== 'Valid' ? 'text-red-600' : 'text-green-600'}`}>
                                                        {item.validation_status}
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        <button
                                                            onClick={() => removeOrderItem(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                            title="Remove item"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No order items detected</p>
                            )}
                        </div>

                        {/* Task Section */}
                        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <h3 className="font-semibold mb-2 text-gray-700">Task</h3>
                            <textarea
                                className="w-full p-2 border border-gray-300 rounded-md"
                                value={extractedData.task}
                                onChange={handleTaskEdit}
                                rows={2}
                                placeholder="No tasks detected"
                            />
                        </div>

                        {/* Notes Section */}
                        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <h3 className="font-semibold mb-2 text-gray-700">Notes</h3>
                            <textarea
                                className="w-full p-2 border border-gray-300 rounded-md"
                                value={extractedData.note}
                                onChange={handleNoteEdit}
                                rows={3}
                                placeholder="No notes detected"
                            />
                        </div>

                        {/* Ambiguities Section */}
                        {extractedData.ambiguities && (
                            <div className="mb-4 p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
                                <h3 className="font-semibold mb-2 text-yellow-800">Ambiguities</h3>
                                <p className="text-yellow-700">{extractedData.ambiguities}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 mt-6">
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition duration-200"
                                onClick={cancelConfirmation}
                            >
                                <XCircle className="w-4 h-4 inline mr-2" />
                                Cancel
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-violet-600 text-white rounded-md hover:from-yellow-700 hover:to-violet-700 transition duration-200"
                                onClick={confirmData}
                            >
                                <CheckCircle className="w-4 h-4 inline mr-2" />
                                Confirm & Save
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Success Message */}
            {finalData && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 border border-green-200 rounded-lg bg-green-50"
                >
                    <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <h2 className="text-lg font-semibold text-green-800">Data Saved Successfully!</h2>
                    </div>
                    <ul className="mt-2 text-green-700">
                        <li>Customer: {finalData.customer}</li>
                        <li>Items: {finalData.quote_order.length}</li>
                        {finalData.task && <li>Task created: {finalData.task}</li>}
                    </ul>
                </motion.div>
            )}
        </motion.div>
    );
};

// Exporting a wrapper component that ensures the OrganizationContext is available
export default function SalesAssistantWrapper() {
    const { selectedOrganization } = useOrganization();

    // If no organization is selected, show a message
    if (!selectedOrganization) {
        return (
            <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-4 text-gray-800">Sales Assistant</h1>
                <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Please select an organization to use the Sales Assistant
                </div>
            </div>
        );
    }

    return <SalesAssistant />;
}