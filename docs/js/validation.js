// フォームバリデーション
const Validation = {
  validateOrdererForm(data) {
    var errors = [];

    if (!data.name || !data.name.trim()) {
      errors.push('注文者のお名前を入力してください');
    }
    if (!data.name_kana || !data.name_kana.trim()) {
      errors.push('注文者のフリガナを入力してください');
    }
    if (!data.zip || !data.zip.trim()) {
      errors.push('注文者の郵便番号を入力してください');
    } else if (!/^\d{3}-?\d{4}$/.test(data.zip.trim())) {
      errors.push('注文者の郵便番号の形式が正しくありません（例: 150-0001）');
    }
    if (!data.prefecture || !data.prefecture.trim()) {
      errors.push('注文者の都道府県を選択してください');
    }
    if (!data.city || !data.city.trim()) {
      errors.push('注文者の市区町村を入力してください');
    }
    if (!data.address1 || !data.address1.trim()) {
      errors.push('注文者の番地を入力してください');
    }
    if (!data.phone || !data.phone.trim()) {
      errors.push('注文者の電話番号を入力してください');
    } else if (!/^[\d\-]{10,14}$/.test(data.phone.trim())) {
      errors.push('注文者の電話番号の形式が正しくありません');
    }
    if (!data.email || !data.email.trim()) {
      errors.push('注文者のメールアドレスを入力してください');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.push('注文者のメールアドレスの形式が正しくありません');
    }

    return errors;
  },

  validateCustomerForm(data) {
    var errors = [];

    if (!data.name || !data.name.trim()) {
      errors.push('お届け先のお名前を入力してください');
    }
    if (!data.name_kana || !data.name_kana.trim()) {
      errors.push('お届け先のフリガナを入力してください');
    }
    if (!data.zip || !data.zip.trim()) {
      errors.push('郵便番号を入力してください');
    } else if (!/^\d{3}-?\d{4}$/.test(data.zip.trim())) {
      errors.push('郵便番号の形式が正しくありません（例: 150-0001）');
    }
    if (!data.prefecture || !data.prefecture.trim()) {
      errors.push('都道府県を選択してください');
    }
    if (!data.city || !data.city.trim()) {
      errors.push('市区町村を入力してください');
    }
    if (!data.address1 || !data.address1.trim()) {
      errors.push('番地を入力してください');
    }
    if (!data.phone || !data.phone.trim()) {
      errors.push('お届け先の電話番号を入力してください');
    } else if (!/^[\d\-]{10,14}$/.test(data.phone.trim())) {
      errors.push('お届け先の電話番号の形式が正しくありません');
    }

    return errors;
  }
};
