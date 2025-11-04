# パスワードリセット機能のセットアップ

パスワードリセット機能を動作させるには、SupabaseダッシュボードでリダイレクトURLを設定する必要があります。

## 🔧 Supabaseの設定手順

### 1. Supabaseダッシュボードにアクセス

https://supabase.com/dashboard にアクセスしてログイン

### 2. プロジェクトを選択

使用しているプロジェクト（amcobnaidtlrigcemooj）を選択

### 3. リダイレクトURLを追加

1. 左側メニューから **Authentication** を選択
2. **URL Configuration** をクリック
3. **Redirect URLs** セクションを見つける
4. 以下のURLを追加:

#### 開発環境用:
```
http://localhost:3002/auth/callback
```

#### 本番環境用（デプロイ時）:
```
https://your-domain.com/auth/callback
```

5. **Save** ボタンをクリック

### 4. メールテンプレートの確認（オプション）

1. 左側メニューから **Authentication** > **Email Templates** を選択
2. **Reset Password** テンプレートを確認
3. 必要に応じてカスタマイズ可能

デフォルトのテンプレートは以下のようになっています：
```
Click this link to reset your password: {{ .ConfirmationURL }}
```

## ✅ 動作確認

設定が完了したら、以下の手順で動作確認してください：

### 1. パスワードリセットを試す

1. http://localhost:3002/login にアクセス
2. 「パスワードを忘れた方」をクリック
3. メールアドレスを入力して送信
4. 登録したメールアドレスを確認
5. メール内のリンクをクリック
6. パスワード更新ページにリダイレクトされることを確認
7. 新しいパスワードを入力
8. ダッシュボードにリダイレクトされることを確認

### 2. トラブルシューティング

#### メールが届かない場合

- 迷惑メールフォルダを確認
- Supabaseダッシュボードで **Authentication** > **Logs** を確認
- メールアドレスが正しく登録されているか確認

#### リダイレクトされない場合

- ブラウザのコンソールでエラーを確認
- Supabaseの **Redirect URLs** に正しいURLが設定されているか確認
- `.env.local`の`NEXT_PUBLIC_APP_URL`が正しいか確認

#### "Invalid redirect URL" エラーが出る場合

- Supabaseダッシュボードの **Redirect URLs** に使用しているURLが追加されているか確認
- URLが完全一致しているか確認（末尾のスラッシュなど）

## 🔐 セキュリティの注意点

### 本番環境での推奨事項

1. **SMTP設定を使用**
   - Supabaseのデフォルトメールではなく、独自のSMTPサーバーを使用
   - Settings > Auth > SMTP Settings で設定

2. **レート制限**
   - パスワードリセット要求の回数制限を設定
   - Supabaseではデフォルトで制限がかかっています

3. **メールテンプレートのカスタマイズ**
   - 会社のブランディングに合わせてカスタマイズ
   - リンクの有効期限を明記

## 📝 実装詳細

### 作成したファイル

1. **`/src/app/auth/callback/route.ts`**
   - メールのリンクからの認証コードを処理
   - セッションを確立してリダイレクト

2. **`/src/app/(auth)/forgot-password/page.tsx`**
   - パスワードリセット要求フォーム

3. **`/src/app/auth/reset-password/page.tsx`**
   - 新しいパスワード入力フォーム

4. **Server Actions**
   - `resetPassword`: パスワードリセットメールを送信
   - `updatePassword`: 新しいパスワードに更新

### フロー図

```
ユーザー
  ↓
ログインページ
  ↓
「パスワードを忘れた方」クリック
  ↓
/forgot-password
  ↓
メールアドレス入力 → Supabaseにリクエスト
  ↓
メール送信
  ↓
ユーザーがメールを確認
  ↓
リンククリック
  ↓
/auth/callback?code=xxx&type=recovery
  ↓
コードを検証してセッション作成
  ↓
/auth/reset-password にリダイレクト
  ↓
新しいパスワード入力
  ↓
パスワード更新
  ↓
/dashboard にリダイレクト
```

## 🌐 環境変数

`.env.local`に以下が設定されていることを確認:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://amcobnaidtlrigcemooj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

本番環境では、`NEXT_PUBLIC_APP_URL`を本番のドメインに変更してください。

---

設定完了後、パスワードリセット機能が正常に動作します。
