import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import ImageUploader from '../../components/ui/ImageUploader.vue';

// Mock $fetch globally
global.$fetch = vi.fn() as any;

mockNuxtImport('useRuntimeConfig', () => {
  return () => ({
    app: { baseURL: '/' },
    public: { apiUrl: 'http://localhost:5010' }
  })
});

describe('ImageUploader.vue', () => {
  it('renders correctly with placeholder', () => {
    const wrapper = mount(ImageUploader, {
      props: {
        placeholder: 'Upload your avatar'
      }
    });
    expect(wrapper.text()).toContain('Upload your avatar');
  });

  it('renders preview if modelValue is provided', () => {
    const wrapper = mount(ImageUploader, {
      props: {
        modelValue: '/preview-image.jpg'
      }
    });
    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('/preview-image.jpg');
  });

  it('emits update:modelValue on successful upload', async () => {
    (global.$fetch as any).mockResolvedValueOnce({
      success: true,
      url: '/uploads/test-image.jpg'
    });

    const wrapper = mount(ImageUploader);
    const fileInput = wrapper.find('input[type="file"]');
    
    // Create a mock file
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file]
    });
    
    await fileInput.trigger('change');
    
    // Wait for async $fetch to resolve
    await new Promise(r => setTimeout(r, 50));

    expect(global.$fetch).toHaveBeenCalledWith('http://localhost:5010/upload', expect.any(Object));
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['/uploads/test-image.jpg']);
  });

  it('displays error message on upload failure', async () => {
    (global.$fetch as any).mockResolvedValueOnce({
      success: false,
      error: 'File too large'
    });

    const wrapper = mount(ImageUploader);
    const fileInput = wrapper.find('input[type="file"]');
    
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    Object.defineProperty(fileInput.element, 'files', { value: [file] });
    
    await fileInput.trigger('change');
    await new Promise(r => setTimeout(r, 50));

    expect(wrapper.text()).toContain('File too large');
  });
});
