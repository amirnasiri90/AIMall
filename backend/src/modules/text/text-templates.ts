export interface TextTemplate {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  promptPrefix?: string;
}

export const TEXT_TEMPLATES: TextTemplate[] = [
  { id: 'free', name: 'آزاد', description: 'هر متنی که بخواهید', placeholder: 'موضوع یا متنی که می‌خواهید تولید شود...' },
  { id: 'social-post', name: 'پست شبکه اجتماعی', description: 'پست اینستاگرام، توییتر یا لینکدین', placeholder: 'موضوع پست و کلمات کلیدی (اختیاری)...' },
  { id: 'blog', name: 'مقاله وبلاگ', description: 'مقاله یا پست وبلاگ با ساختار منظم', placeholder: 'عنوان و خلاصه موضوع مقاله...' },
  { id: 'product-desc', name: 'معرفی محصول', description: 'توضیح فروشگاهی یا معرفی محصول', placeholder: 'نام محصول و ویژگی‌های کلیدی...' },
  { id: 'email', name: 'ایمیل', description: 'ایمیل رسمی یا دوستانه', placeholder: 'هدف ایمیل و نکات اصلی...' },
  { id: 'meta-seo', name: 'متا و SEO', description: 'عنوان و توضیح متا برای سئو', placeholder: 'عنوان صفحه و کلمات کلیدی...' },
  { id: 'ad-copy', name: 'متن تبلیغ', description: 'متن آگهی یا کمپین تبلیغاتی', placeholder: 'محصول/خدمت و مخاطب هدف...' },
  { id: 'headline', name: 'عنوان و زیرعنوان', description: 'عنوان جذاب و زیرعنوان', placeholder: 'موضوع و لحن مورد نظر...' },
];
