import { init } from '@automatos/loader';

init({
  apiKey: 'ak_pub_test_123',
  widget: 'chat',
  baseUrl: 'http://localhost:8000',
  position: 'bottom-right',
  theme: 'light',
  greeting: 'Hi! How can I help you today?',
});
