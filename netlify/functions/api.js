import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
    const sql = neon(process.env.DATABASE_URL);
    const method = req.method;
    
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
    };

    if (method === "OPTIONS") return new Response("OK", { headers });

    try {
        const url = new URL(req.url);
        const path = url.searchParams.get('path'); 
        const category = url.searchParams.get('cat'); // Filter by category

        // --- 1. GET PRODUCTS (With Category Filter) ---
        if (method === "GET" && path === 'products') {
            if (category && category !== 'All') {
                const rows = await sql`SELECT * FROM products WHERE category = ${category} ORDER BY id DESC`;
                return new Response(JSON.stringify(rows), { headers: { ...headers, "Content-Type": "application/json" } });
            }
            const rows = await sql`SELECT * FROM products ORDER BY id DESC`;
            return new Response(JSON.stringify(rows), { headers: { ...headers, "Content-Type": "application/json" } });
        }

        // --- 2. ADMIN DASHBOARD STATS ---
        if (method === "GET" && path === 'stats') {
            const pCount = await sql`SELECT count(*) FROM products`;
            const oCount = await sql`SELECT count(*) FROM orders`;
            return new Response(JSON.stringify({ products: pCount[0].count, orders: oCount[0].count }), { headers: { ...headers, "Content-Type": "application/json" } });
        }

        // --- 3. ADD PRODUCT (Admin) ---
        if (method === "POST" && path === 'products') {
            const body = await req.json();
            await sql`
                INSERT INTO products (name, price, discount_price, category, sub_category, images, variants, is_featured)
                VALUES (${body.name}, ${body.price}, ${body.discount_price}, ${body.category}, ${body.sub_category}, ${body.images}, ${body.variants}, ${body.is_featured})
            `;
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        // --- 4. PLACE ORDER (Customer) ---
        if (method === "POST" && path === 'orders') {
            const body = await req.json();
            await sql`
                INSERT INTO orders (customer_details, cart_items, total_amount, status)
                VALUES (${body.customer}, ${body.items}, ${body.total}, 'Processing')
            `;
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        // --- 5. DELETE PRODUCT ---
        if (method === "DELETE") {
            const id = url.searchParams.get('id');
            await sql`DELETE FROM products WHERE id = ${id}`;
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        return new Response("Not Found", { status: 404, headers });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
};
