-- Add max_devices_override column to allow admin to override plan device limits per user
ALTER TABLE public.user_subscriptions 
ADD COLUMN max_devices_override INTEGER DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.user_subscriptions.max_devices_override IS 'Admin can override the plan max_devices for individual users';