function validatePhone(s){
    return !!s.match(/^[0-9]{3}[ -][0-9]{3}[ -][0-9]{4}$/)
}