// Emergency script to fix Indiana image
import { Pool } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: databaseUrl });

async function fixIndianaImage() {
  try {
    console.log('🔧 Updating Indiana state landing page...');
    
    const result = await pool.query(
      `UPDATE state_landing_pages 
       SET background_image_url = $1, updated_at = NOW() 
       WHERE state_code = 'IN' 
       RETURNING *`,
      ['/uploads/indiana-hero.jpeg']
    );
    
    console.log('✅ SUCCESS! Updated row:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    // Verify it was updated
    const verify = await pool.query(
      `SELECT * FROM state_landing_pages WHERE state_code = 'IN'`
    );
    
    console.log('\n✅ VERIFIED - Current row:');
    console.log(JSON.stringify(verify.rows[0], null, 2));
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await pool.end();
  }
}

fixIndianaImage();
