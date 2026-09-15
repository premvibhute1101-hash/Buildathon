import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import SiteComparisonSlider from '../SiteComparisonSlider';
import { SiteComparison } from '../../types';


describe('SiteComparisonSlider Component', () => {
  const mockComparison: SiteComparison = {
    id: 'comp-123',
    project_id: 'proj-456',
    project_name: 'Metropolis Commercial Tower',
    location_tag: 'North Wing — Level 2 Framing',
    before_photo_id: 'img-1',
    after_photo_id: 'img-2',
    before_date: '2026-09-01T10:00:00Z',
    after_date: '2026-09-10T14:00:00Z',
    created_by: 'user-789',
    created_by_name: 'Alexander Vance',
    created_at: '2026-09-10T15:00:00Z',
    before_photo: {
      id: 'img-1',
      url: '/uploads/before_photo.jpg',
      location_tag: 'North Wing — Level 2 Framing',
      ai_label: 'compliant',
      ai_confidence: 0.95,
      created_at: '2026-09-01T10:00:00Z',
      detections: [
        {
          id: 'det-1',
          class_name: 'hardhat',
          confidence: 0.96,
          bbox_x: 100,
          bbox_y: 50,
          bbox_w: 80,
          bbox_h: 80,
        },
      ],
    },
    after_photo: {
      id: 'img-2',
      url: '/uploads/after_photo.jpg',
      location_tag: 'North Wing — Level 2 Framing',
      ai_label: 'issue_detected',
      ai_confidence: 0.88,
      created_at: '2026-09-10T14:00:00Z',
      detections: [
        {
          id: 'det-2',
          class_name: 'no_hardhat',
          confidence: 0.88,
          bbox_x: 120,
          bbox_y: 60,
          bbox_w: 75,
          bbox_h: 75,
        },
      ],
    },
    ai_summary: 'Progress increased ~40%; 1 new safety flag (no_hardhat) detected between Sept 1 and Sept 10.',
    safety_diff: {
      before_violations_count: 0,
      after_violations_count: 1,
      diff_count: 1,
      before_classes: ['hardhat'],
      after_classes: ['no_hardhat'],
      new_violations: ['no_hardhat'],
      resolved_violations: [],
      status_change: 'degraded',
    },
  };

  it('renders both before and after images with correct attributes', () => {
    render(<SiteComparisonSlider comparison={mockComparison} />);

    const beforeImg = screen.getByTestId('before-image') as HTMLImageElement;
    const afterImg = screen.getByTestId('after-image') as HTMLImageElement;

    expect(beforeImg).toBeInTheDocument();
    expect(afterImg).toBeInTheDocument();
    expect(beforeImg.src).toContain('/uploads/before_photo.jpg');
    expect(afterImg.src).toContain('/uploads/after_photo.jpg');
  });

  it('displays the location tag and project name', () => {
    render(<SiteComparisonSlider comparison={mockComparison} />);

    expect(screen.getByTestId('location-tag')).toHaveTextContent('North Wing — Level 2 Framing');
    expect(screen.getByText('Metropolis Commercial Tower')).toBeInTheDocument();
  });

  it('renders before and after date label pills with formatted dates', () => {
    render(<SiteComparisonSlider comparison={mockComparison} />);

    const beforePill = screen.getByTestId('before-pill');
    const afterPill = screen.getByTestId('after-pill');

    expect(beforePill).toBeInTheDocument();
    expect(afterPill).toBeInTheDocument();

    expect(beforePill).toHaveTextContent(/BEFORE/i);
    expect(beforePill).toHaveTextContent(/Sep 1, 2026/i);

    expect(afterPill).toHaveTextContent(/AFTER/i);
    expect(afterPill).toHaveTextContent(/Sep 10, 2026/i);
  });

  it('renders the GenAI intelligence synthesis summary and safety diff stats', () => {
    render(<SiteComparisonSlider comparison={mockComparison} />);

    expect(screen.getByTestId('ai-summary-text')).toHaveTextContent(
      'Progress increased ~40%; 1 new safety flag (no_hardhat) detected between Sept 1 and Sept 10.'
    );
    expect(screen.getByText(/1 active flags/i)).toBeInTheDocument();
    expect(screen.getByText(/was 0/i)).toBeInTheDocument();
  });
});
