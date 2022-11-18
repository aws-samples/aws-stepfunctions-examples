export class Helpers {
    static timestampInSeconds = (date: Date): string => {
        return `${Math.floor(date.getTime() / 1000)}`;
    }
    
    static addDays = (date: number, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
}