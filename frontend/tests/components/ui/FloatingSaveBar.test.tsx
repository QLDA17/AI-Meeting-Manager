import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FloatingSaveBar from '../../../src/components/ui/FloatingSaveBar';

describe('FloatingSaveBar Component', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders correctly when visible', () => {
    render(
      <FloatingSaveBar 
        isVisible={true} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByText(/Cấu hình chưa được lưu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu thay đổi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hủy bỏ/i })).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const { container } = render(
      <FloatingSaveBar 
        isVisible={false} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('calls onSave when save button is clicked', () => {
    render(
      <FloatingSaveBar 
        isVisible={true} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <FloatingSaveBar 
        isVisible={true} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /Hủy bỏ/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
