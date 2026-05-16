import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-md active:opacity-80',
  {
    variants: {
      variant: {
        default: 'bg-blue-600',
        destructive: 'bg-red-600',
        outline: 'bg-white border border-slate-300',
        secondary: 'bg-slate-200',
        ghost: 'bg-transparent',
        link: 'bg-transparent',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3',
        lg: 'h-10 px-6',
        icon: 'w-9 h-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const textColorVariants: Record<string, string> = {
  default: '#ffffff',
  destructive: '#ffffff',
  outline: '#000000',
  secondary: '#000000',
  ghost: '#000000',
  link: '#2563eb',
};

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    children: React.ReactNode;
    loading?: boolean;
  };

export const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>(
  (
    {
      children,
      className,
      variant = 'default',
      size = 'default',
      disabled,
      loading,
      ...props
    },
    ref,
  ) => {
    const textColor =
      textColorVariants[
        (variant ?? 'default') as keyof typeof textColorVariants
      ] || '#ffffff';
    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        className={cn(
          buttonVariants({ variant, size }),
          isDisabled && 'opacity-50',
          className,
        )}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text
            className={cn(
              'font-semibold',
              variant === 'default' && 'text-white',
              variant === 'destructive' && 'text-white',
              variant === 'outline' && 'text-black',
              variant === 'secondary' && 'text-black',
              variant === 'ghost' && 'text-black',
              variant === 'link' && 'text-blue-600',
            )}
          >
            {children}
          </Text>
        )}
      </Pressable>
    );
  },
);

Button.displayName = 'Button';
