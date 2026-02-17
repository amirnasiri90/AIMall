export interface ImageTemplate {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  promptSuffix?: string;
}

export const IMAGE_TEMPLATES: ImageTemplate[] = [
  { id: 'free', name: 'آزاد', description: 'هر تصویری', placeholder: 'تصویر مورد نظر خود را توصیف کنید...' },
  { id: 'logo', name: 'لوگو', description: 'لوگو و نشانواره', placeholder: 'نام برند، صنعت، سبک (مینیمال، گرادیان، ...)', promptSuffix: 'logo design, minimal, professional, vector style' },
  { id: 'banner', name: 'بنر شبکه اجتماعی', description: 'پست و استوری', placeholder: 'موضوع، متن روی تصویر، رنگ‌ها', promptSuffix: 'social media banner, eye-catching, modern' },
  { id: 'product', name: 'تصویر محصول', description: 'محصول روی پس‌زمینه', placeholder: 'نام محصول، پس‌زمینه (سفید، طبیعت، ...)', promptSuffix: 'product photography, clean background, professional lighting' },
  { id: 'background', name: 'پس‌زمینه', description: 'والپیپر و بک‌گراند', placeholder: 'فضا، رنگ، سبک (انتزاعی، طبیعت، ...)', promptSuffix: 'wallpaper, seamless, high quality' },
  { id: 'portrait', name: 'پرتره', description: 'چهره و پرتره هنری', placeholder: 'نوع چهره، حالت، سبک نورپردازی', promptSuffix: 'portrait, professional lighting, detailed' },
  { id: 'landscape', name: 'لنداسکیپ', description: 'طبیعت و منظره', placeholder: 'مکان، زمان روز، جو (بارانی، آفتابی، ...)', promptSuffix: 'landscape, scenic, atmospheric' },
  { id: 'character', name: 'کاراکتر / انیمه', description: 'شخصیت و کارتون', placeholder: 'ظاهر، لباس، حالت، سبک', promptSuffix: 'character design, expressive, detailed' },
];
