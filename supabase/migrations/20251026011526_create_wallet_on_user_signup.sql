/*
  # Auto-create wallet on user signup

  1. Trigger Function
    - Creates a wallet automatically when a new user signs up
    - Sets initial balances to 0
  
  2. Security
    - Runs with SECURITY DEFINER to bypass RLS
    - Only creates wallet, doesn't modify existing data
*/

CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, available_balance, pending_balance, total_withdrawn)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();