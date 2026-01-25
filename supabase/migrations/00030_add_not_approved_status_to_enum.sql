-- Add 'not_approved' status to order_status enum
-- This status is used when a client doesn't approve the budget
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'not_approved' AFTER 'approved';