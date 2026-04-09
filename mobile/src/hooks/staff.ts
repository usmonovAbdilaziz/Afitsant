import { LoginStaff } from '@/api/authApi';
import { useMutation } from '@tanstack/react-query';
export function useStaffLogin(){
    return useMutation({
        mutationKey:['login-staff'],
        mutationFn:(body:{fullName:string,phoneNumber:string})=>LoginStaff(body)
    })
}