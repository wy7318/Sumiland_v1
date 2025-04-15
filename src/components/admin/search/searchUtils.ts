// searchUtils.ts - Updated to use Supabase
import { supabase } from '../../../lib/supabase'; // Adjust path as needed

/**
 * Performs global search across all tables
 * @param query Search string
 * @returns Formatted search results
 */
export async function performGlobalSearch(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  const searchString = query.toLowerCase();
  const results = [];
  
  try {
    // Search vendors (accounts)
    // Use the proper filter syntax for Supabase
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select(`
        id, 
        name, 
        status, 
        type
      `)
      .ilike('name', `%${searchString}%`)
      .limit(10);
    
    if (vendorsError) {
      console.error('Error searching vendors:', vendorsError);
    } else if (vendors && vendors.length > 0) {
      results.push(
        ...vendors.map(vendor => ({
          id: vendor.id,
          type: 'Account',
          name: vendor.name,
          subtitle: vendor.status || '',
          url: `/admin/vendors/${vendor.id}`,
          status: vendor.status
        }))
      );
    }
    
    // Search customers (contacts)
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select(`
        id, 
        first_name, 
        last_name, 
        email, 
        company, 
        phone
      `)
      .or(`first_name.ilike.%${searchString}%,last_name.ilike.%${searchString}%,email.ilike.%${searchString}%,company.ilike.%${searchString}%`)
      .limit(10);
    
    if (customersError) {
      console.error('Error searching customers:', customersError);
    } else if (customers && customers.length > 0) {
      results.push(
        ...customers.map(customer => ({
          id: customer.id,
          type: 'Contact',
          name: `${customer.first_name} ${customer.last_name}`,
          subtitle: customer.email || customer.company || '',
          url: `/admin/customers/${customer.id}`
        }))
      );
    }
    
    // Search leads
    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id, 
          first_name, 
          last_name, 
          email, 
          company,
          status,
          lead_source
        `)
        .or(`first_name.ilike.%${searchString}%,last_name.ilike.%${searchString}%,email.ilike.%${searchString}%,company.ilike.%${searchString}%`)
        .limit(10);
      
      if (leadsError) {
        console.error('Error searching leads:', leadsError);
      } else if (leads && leads.length > 0) {
        results.push(
          ...leads.map(lead => ({
            id: lead.id,
            type: 'Lead',
            name: `${lead.first_name} ${lead.last_name}`,
            subtitle: lead.email || lead.company || '',
            url: `/admin/leads/${lead.id}`,
            status: lead.status
          }))
        );
      }
    } catch (leadsError) {
      console.error('Error in leads search:', leadsError);
    }
    
    // Search cases
    try {
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select(`
          id, 
          title, 
          status, 
          type
        `)
        .ilike('title', `%${searchString}%`)
        .limit(10);
      
      if (casesError) {
        console.error('Error searching cases:', casesError);
      } else if (cases && cases.length > 0) {
        results.push(
          ...cases.map(case_ => ({
            id: case_.id,
            type: 'Case',
            name: case_.title,
            subtitle: case_.type || '',
            url: `/admin/cases/${case_.id}`,
            status: case_.status
          }))
        );
      }
    } catch (casesError) {
      console.error('Error in cases search:', casesError);
    }
    
    // Search opportunities
    try {
      const { data: opportunities, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select(`
          id, 
          name, 
          stage, 
          type
        `)
        .ilike('name', `%${searchString}%`)
        .limit(10);
      
      if (opportunitiesError) {
        console.error('Error searching opportunities:', opportunitiesError);
      } else if (opportunities && opportunities.length > 0) {
        results.push(
          ...opportunities.map(opp => ({
            id: opp.id,
            type: 'Opportunity',
            name: opp.name,
            subtitle: opp.type || '',
            url: `/admin/opportunities/${opp.id}`,
            stage: opp.stage
          }))
        );
      }
    } catch (oppsError) {
      console.error('Error in opportunities search:', oppsError);
    }

    // Search quotes
    try {
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          status,
          total_amount,
          customer_id
        `)
        .or(`quote_number.ilike.%${searchString}%,notes.ilike.%${searchString}%`)
        .limit(10);
      
      if (quotesError) {
        console.error('Error searching quotes:', quotesError);
      } else if (quotes && quotes.length > 0) {
        results.push(
          ...quotes.map(quote => ({
            id: quote.id,
            type: 'Quote',
            name: `Quote #${quote.quote_number}`,
            subtitle: `$${quote.total_amount || 0}`,
            url: `/admin/quotes/${quote.id}`,
            status: quote.status
          }))
        );
      }
    } catch (error) {
      console.error('Error in quotes search:', error);
    }
    
    // Search orders
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          customer_id
        `)
        .or(`order_number.ilike.%${searchString}%,notes.ilike.%${searchString}%,po_number.ilike.%${searchString}%`)
        .limit(10);
      
      if (ordersError) {
        console.error('Error searching orders:', ordersError);
      } else if (orders && orders.length > 0) {
        results.push(
          ...orders.map(order => ({
            id: order.id,
            type: 'Order',
            name: `Order #${order.order_number}`,
            subtitle: `$${order.total_amount || 0}`,
            url: `/admin/orders/${order.id}`,
            status: order.status,
            payment_status: order.payment_status
          }))
        );
      }
    } catch (error) {
      console.error('Error in orders search:', error);
    }
    
    // Search tasks
    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          is_done,
          is_personal,
          due_date,
          assigned_to
        `)
        .or(`title.ilike.%${searchString}%,description.ilike.%${searchString}%`)
        .limit(10);
      
      if (tasksError) {
        console.error('Error searching tasks:', tasksError);
      } else if (tasks && tasks.length > 0) {
        results.push(
          ...tasks.map(task => ({
            id: task.id,
            type: 'Task',
            name: task.title,
            subtitle: task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date',
            url: `/admin/tasks/${task.id}/edit`,
            is_done: task.is_done
          }))
        );
      }
    } catch (error) {
      console.error('Error in tasks search:', error);
    }
    
    // Search products
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          status,
          category,
          sku
        `)
        .or(`name.ilike.%${searchString}%,description.ilike.%${searchString}%,sku.ilike.%${searchString}%,category.ilike.%${searchString}%`)
        .limit(10);
      
      if (productsError) {
        console.error('Error searching products:', productsError);
      } else if (products && products.length > 0) {
        results.push(
          ...products.map(product => ({
            id: product.id,
            type: 'Product',
            name: product.name,
            subtitle: product.sku ? `SKU: ${product.sku}` : (product.category || ''),
            url: `/admin/products/${product.id}`,
            status: product.status
          }))
        );
      }
    } catch (error) {
      console.error('Error in products search:', error);
    }
    
    // Add other searches as needed for quotes, orders, tasks, products, etc.
    
  } catch (error) {
    console.error('Global search error:', error);
  }
  
  return results;
}