import { useState } from 'react';
export function useCheckout() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitOrder = async () => {
        setIsSubmitting(true);
        await new Promise(r => setTimeout(r, 500));
        setIsSubmitting(false);
    };
    return { isSubmitting, submitOrder };
}
