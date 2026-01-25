-- Adicionar trigger para INSERT (Google OAuth)
-- Quando um usuário faz login com Google, ele é inserido diretamente como confirmado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL OR NEW.phone_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Comentário: Este trigger garante que usuários do Google OAuth tenham perfis criados automaticamente