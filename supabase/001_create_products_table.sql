-- Create products table for Dallas Boutique
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image TEXT,
  category TEXT NOT NULL DEFAULT 'destaques',
  specs JSONB DEFAULT '{}',
  rating DECIMAL(2,1) DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_users table to track who can manage products
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read products (public catalog)
CREATE POLICY "products_select_public" ON products 
  FOR SELECT USING (true);

-- Only admin users can insert products
CREATE POLICY "products_insert_admin" ON products 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Only admin users can update products
CREATE POLICY "products_update_admin" ON products 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Only admin users can delete products
CREATE POLICY "products_delete_admin" ON products 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can see admin_users table
CREATE POLICY "admin_users_select" ON admin_users 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products updated_at
DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial products from the existing catalog
INSERT INTO products (name, price, description, image, category, specs, rating, reviews, in_stock, is_featured) VALUES
  ('Oleo de Massagem Sensual', 45.90, 'Oleo de massagem com fragrancia suave e efeito aquecedor. Perfeito para momentos especiais a dois. Formula desenvolvida com ingredientes naturais que promovem relaxamento e bem-estar.', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop', 'massagem', '{"volume": "120ml", "ingredients": "Oleo de amendoas, vitamina E, fragrancia", "duration": "Efeito prolongado", "skin_type": "Todos os tipos de pele"}', 4.8, 127, true, false),
  ('Vela Aromatica Relaxante', 35.00, 'Vela aromatica com essencia de baunilha e lavanda. Cria um ambiente aconchegante e relaxante. Feita artesanalmente com cera de soja natural e pavio de algodao.', 'https://images.unsplash.com/photo-1602607446364-d37774451ea6?w=400&h=400&fit=crop', 'destaques', '{"burn_time": "40 horas", "weight": "200g", "ingredients": "Cera de soja, oleos essenciais", "fragrance": "Baunilha e lavanda"}', 4.9, 89, true, true),
  ('Kit Dados Eroticos', 29.90, 'Kit com 3 dados para brincadeiras a dois. Inclui dado de acoes, posicoes e partes do corpo. Material premium com acabamento acetinado.', 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=400&h=400&fit=crop', 'brinquedos', '{"quantity": "3 dados", "material": "Acrilico premium", "size": "2.5cm cada", "content": "18+ combinacoes"}', 4.5, 64, true, false),
  ('Gel Beijavel Morango', 25.00, 'Gel beijavel sabor morango com efeito comestivel. Nao mancha e nao gruda. Formula segura e dermatologicamente testada.', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop', 'destaques', '{"volume": "35ml", "flavor": "Morango", "texture": "Gel suave", "safety": "Dermatologicamente testado"}', 4.7, 156, true, true),
  ('Pluma para Caricias', 19.90, 'Pluma macia para caricias sensuais. Ideal para preliminares. Cabo em acrilico com penas naturais selecionadas.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop', 'brinquedos', '{"length": "25cm", "material": "Penas naturais, cabo acrilico", "color": "Preto", "care": "Limpar com pano seco"}', 4.4, 42, true, false),
  ('Locao Hidratante Corpo', 55.00, 'Locao hidratante corporal com efeito sedoso. Fragrancia suave e duradoura. Enriquecida com manteigas naturais.', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop', 'massagem', '{"volume": "200ml", "ingredients": "Manteiga de karite, oleo de coco", "absorption": "Rapida absorcao", "skin_type": "Todos os tipos de pele"}', 4.6, 98, true, false),
  ('Venda Cetim Premium', 39.90, 'Venda em cetim premium para brincadeiras. Ajustavel e confortavel. Elastico macio que nao marca a pele.', 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&h=400&fit=crop', 'brinquedos', '{"material": "Cetim premium", "size": "Ajustavel", "color": "Preto", "care": "Lavar a mao"}', 4.8, 73, true, false),
  ('Oleo Corporal Brilho', 49.90, 'Oleo corporal com particulas de brilho. Hidrata e deixa a pele com aspecto luminoso. Efeito champagne dourado.', 'https://images.unsplash.com/photo-1617897903246-719242758050?w=400&h=400&fit=crop', 'massagem', '{"volume": "100ml", "effect": "Brilho dourado", "ingredients": "Oleo de argan, particulas de brilho", "duration": "Longa duracao"}', 4.9, 145, true, true),
  ('Kit Petalas de Rosa', 22.00, 'Kit com 100 petalas de rosa artificiais para decoracao romantica. Reutilizavel e sem perfume. Ideal para criar ambientes especiais.', 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400&h=400&fit=crop', 'destaques', '{"quantity": "100 petalas", "material": "Seda artificial", "reusable": "Sim", "color": "Vermelho"}', 4.3, 58, true, false),
  ('Chicote Sensual Suave', 45.00, 'Chicote sensual com tiras em couro sintetico. Design elegante em preto. Ideal para iniciantes que desejam explorar novas sensacoes.', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop', 'brinquedos', '{"length": "45cm", "material": "Couro sintetico premium", "intensity": "Suave", "handle": "Ergonomico"}', 4.6, 67, true, false);
